import {
  tags,
  factions,
  committees,
  createInterviewConfig,
  createInterviewQuestions,
  createInterviewSessions,
  createInterviewMessages,
  createInterviewReports,
  createDemoSession,
  createDemoMessages,
  createDemoReport,
  createAdditionalDemoSessions,
  createAdditionalDemoMessages,
  createAdditionalDemoReports,
  DEMO_REPORT_ID,
  DEMO_REPORT_ID_WORK,
  DEMO_REPORT_ID_DAILY,
  DEMO_REPORT_ID_CITIZEN,
} from "./data";
import { INTERVIEW_TARGET, sapporoSessions } from "./sapporo-bills/sessions";
import { createAdminClient, clearAllData } from "../shared/helper";

async function seedDatabase() {
  const supabase = createAdminClient();
  console.log("🌱 Starting database seeding...");

  try {
    await clearAllData(supabase);

    // Insert tags
    console.log("🏷️  Inserting tags...");
    const { data: insertedTags, error: tagsError } = await supabase
      .from("tags")
      .insert(tags)
      .select("id, label");

    if (tagsError) throw new Error(`Failed to insert tags: ${tagsError.message}`);
    if (!insertedTags) throw new Error("No tags were inserted");
    console.log(`✅ Inserted ${insertedTags.length} tags`);

    // Insert committees
    console.log("🏢 Inserting committees...");
    const { data: insertedCommittees, error: committeesError } = await supabase
      .from("committees")
      .insert(committees)
      .select("id, name");

    if (committeesError) throw new Error(`Failed to insert committees: ${committeesError.message}`);
    if (!insertedCommittees) throw new Error("No committees were inserted");
    console.log(`✅ Inserted ${insertedCommittees.length} committees`);

    // Insert factions
    console.log("🏛️  Inserting factions...");
    const { data: insertedFactions, error: factionsError } = await supabase
      .from("factions")
      .insert(factions)
      .select("id, name");

    if (factionsError) throw new Error(`Failed to insert factions: ${factionsError.message}`);
    if (!insertedFactions) throw new Error("No factions were inserted");
    console.log(`✅ Inserted ${insertedFactions.length} factions`);

    const committeeIdByName = new Map(insertedCommittees.map((c) => [c.name, c.id]));
    const factionIdByName = new Map(insertedFactions.map((f) => [f.name, f.id]));
    const tagIdByLabel = new Map(insertedTags.map((t) => [t.label, t.id]));
    const requireId = (map: Map<string, string>, key: string, kind: string) => {
      const id = map.get(key);
      if (!id) throw new Error(`Unknown ${kind}: ${key}`);
      return id;
    };

    // Insert council sessions and bills (sapporo-bills/ の実データ)
    console.log("🏛️  Inserting council sessions and bills...");
    let councilSessionCount = 0;
    let billCount = 0;
    let contentCount = 0;
    let stanceCount = 0;
    let billsTagsCount = 0;
    let billCommitteeCount = 0;
    let interviewTargetBillId: string | null = null;

    for (const session of sapporoSessions) {
      const { data: insertedSession, error: sessionError } = await supabase
        .from("council_sessions")
        .insert({
          slug: session.slug,
          name: session.name,
          start_date: session.startDate,
          end_date: session.endDate,
          council_url: session.councilUrl,
          is_active: session.isActive,
        })
        .select("id")
        .single();
      if (sessionError) throw new Error(`Failed to insert council session ${session.slug}: ${sessionError.message}`);
      councilSessionCount++;

      const { data: insertedBills, error: billsError } = await supabase
        .from("bills")
        .insert(
          session.bills.map((bill) => ({
            council_session_id: insertedSession.id,
            bill_number: bill.billNumber,
            bill_type: bill.billType,
            name: bill.name,
            source_url: bill.sourceUrl,
            status: bill.status,
            status_note: bill.statusNote,
            published_at: bill.publishedAt,
            publish_status: "published" as const,
            is_featured: bill.isFeatured,
          }))
        )
        .select("id, bill_number, bill_type");
      if (billsError) throw new Error(`Failed to insert bills for ${session.slug}: ${billsError.message}`);
      billCount += insertedBills.length;

      const billIdByKey = new Map(
        insertedBills.map((b) => [`${b.bill_number}|${b.bill_type}`, b.id])
      );
      const billIdOf = (billNumber: string, billType: string) =>
        requireId(billIdByKey, `${billNumber}|${billType}`, "bill");

      const contents = session.bills.flatMap((bill) => {
        const billId = billIdOf(bill.billNumber, bill.billType);
        return (["normal", "hard"] as const).map((level) => ({
          bill_id: billId,
          difficulty_level: level,
          ...bill.contents[level],
        }));
      });
      const billCommittees = session.bills.flatMap((bill) =>
        bill.committees.map((name) => ({
          bill_id: billIdOf(bill.billNumber, bill.billType),
          committee_id: requireId(committeeIdByName, name, "committee"),
        }))
      );
      // 採決のあった議案だけ会派賛否を登録する（報告・会期中の議案は除く）
      const stances = session.bills
        .filter((bill) => bill.status !== "reported" && bill.status !== "submitted")
        .flatMap((bill) => {
          for (const name of bill.againstFactions) requireId(factionIdByName, name, "faction");
          return insertedFactions.map((faction) => ({
            bill_id: billIdOf(bill.billNumber, bill.billType),
            faction_id: faction.id,
            type: bill.againstFactions.includes(faction.name) ? ("against" as const) : ("for" as const),
          }));
        });
      const billsTags = session.bills.flatMap((bill) =>
        bill.tags.map((label) => ({
          bill_id: billIdOf(bill.billNumber, bill.billType),
          tag_id: requireId(tagIdByLabel, label, "tag"),
        }))
      );

      const { error: contentsError } = await supabase.from("bill_contents").insert(contents);
      if (contentsError) throw new Error(`Failed to insert bill contents for ${session.slug}: ${contentsError.message}`);
      if (billCommittees.length > 0) {
        const { error } = await supabase.from("bill_committees").insert(billCommittees);
        if (error) throw new Error(`Failed to insert bill committees for ${session.slug}: ${error.message}`);
      }
      if (stances.length > 0) {
        const { error } = await supabase.from("faction_stances").insert(stances);
        if (error) throw new Error(`Failed to insert faction stances for ${session.slug}: ${error.message}`);
      }
      const { error: billsTagsError } = await supabase.from("bills_tags").insert(billsTags);
      if (billsTagsError) throw new Error(`Failed to insert bills-tags for ${session.slug}: ${billsTagsError.message}`);

      contentCount += contents.length;
      billCommitteeCount += billCommittees.length;
      stanceCount += stances.length;
      billsTagsCount += billsTags.length;

      if (session.slug === INTERVIEW_TARGET.sessionSlug) {
        const target = insertedBills.find((b) => b.bill_number === INTERVIEW_TARGET.billNumber && b.bill_type === "bill");
        interviewTargetBillId = target?.id ?? null;
      }
      console.log(`✅ ${session.slug}: ${insertedBills.length} bills`);
    }

    // Insert interview config (子ども医療費議案)
    console.log("💬 Inserting interview config...");
    const interviewConfigData = interviewTargetBillId
      ? createInterviewConfig(interviewTargetBillId)
      : null;
    let insertedQuestionsCount = 0;
    let insertedSessionsCount = 0;
    let insertedMessagesCount = 0;
    let insertedReportsCount = 0;

    if (interviewConfigData) {
      const { data: insertedConfig, error: configError } = await supabase
        .from("interview_configs")
        .insert(interviewConfigData)
        .select("id")
        .single();

      if (configError) throw new Error(`Failed to insert interview config: ${configError.message}`);

      if (insertedConfig) {
        console.log(`✅ Inserted interview config`);

        // Interview questions
        console.log("❓ Inserting interview questions...");
        const questionsData = createInterviewQuestions(insertedConfig.id);
        const { data: insertedQuestions, error: questionsError } = await supabase
          .from("interview_questions")
          .insert(questionsData)
          .select("id");

        if (questionsError) throw new Error(`Failed to insert interview questions: ${questionsError.message}`);
        if (insertedQuestions) {
          insertedQuestionsCount = insertedQuestions.length;
          console.log(`✅ Inserted ${insertedQuestionsCount} interview questions`);
        }

        // Interview sessions (100件)
        console.log("🗣️ Inserting interview sessions...");
        const sessionsData = createInterviewSessions(insertedConfig.id);
        const { data: insertedSessions, error: sessionsError } = await supabase
          .from("interview_sessions")
          .insert(sessionsData)
          .select("id");

        if (sessionsError) throw new Error(`Failed to insert interview sessions: ${sessionsError.message}`);

        if (insertedSessions && insertedSessions.length > 0) {
          insertedSessionsCount = insertedSessions.length;
          console.log(`✅ Inserted ${insertedSessionsCount} interview sessions`);

          // Interview messages
          console.log("💬 Inserting interview messages...");
          const sessionIds = insertedSessions.map((s) => s.id);
          const messagesData = createInterviewMessages(sessionIds);
          const { data: insertedMessages, error: messagesError } = await supabase
            .from("interview_messages")
            .insert(messagesData)
            .select("id");

          if (messagesError) throw new Error(`Failed to insert interview messages: ${messagesError.message}`);
          if (insertedMessages) {
            insertedMessagesCount = insertedMessages.length;
            console.log(`✅ Inserted ${insertedMessagesCount} interview messages`);
          }

          // Interview reports
          console.log("📊 Inserting interview reports...");
          const reportsData = createInterviewReports(sessionIds);
          const { data: insertedReports, error: reportsError } = await supabase
            .from("interview_report")
            .insert(reportsData)
            .select("id");

          if (reportsError) throw new Error(`Failed to insert interview reports: ${reportsError.message}`);
          if (insertedReports) {
            insertedReportsCount = insertedReports.length;
            console.log(`✅ Inserted ${insertedReportsCount} interview reports`);
          }

          // Demo data with fixed IDs
          console.log("🎯 Inserting demo data with fixed IDs...");

          const demoSession = createDemoSession(insertedConfig.id);
          const { error: demoSessionError } = await supabase
            .from("interview_sessions")
            .insert(demoSession);
          if (demoSessionError) throw new Error(`Failed to insert demo session: ${demoSessionError.message}`);

          const demoMessages = createDemoMessages();
          const { error: demoMessagesError } = await supabase
            .from("interview_messages")
            .insert(demoMessages);
          if (demoMessagesError) throw new Error(`Failed to insert demo messages: ${demoMessagesError.message}`);

          const demoReport = createDemoReport();
          const { error: demoReportError } = await supabase
            .from("interview_report")
            .insert(demoReport);
          if (demoReportError) throw new Error(`Failed to insert demo report: ${demoReportError.message}`);

          console.log(`✅ Inserted demo data`);
          console.log(`   Demo report URL: /report/${DEMO_REPORT_ID}/chat-log`);

          // Additional demo sessions for all 4 role types
          console.log("🎭 Inserting additional demo data for all role types...");

          const additionalDemoSessions = createAdditionalDemoSessions(insertedConfig.id);
          const { error: additionalSessionsError } = await supabase
            .from("interview_sessions")
            .insert(additionalDemoSessions);
          if (additionalSessionsError) throw new Error(`Failed to insert additional demo sessions: ${additionalSessionsError.message}`);

          const additionalDemoMessages = createAdditionalDemoMessages();
          const { error: additionalMessagesError } = await supabase
            .from("interview_messages")
            .insert(additionalDemoMessages);
          if (additionalMessagesError) throw new Error(`Failed to insert additional demo messages: ${additionalMessagesError.message}`);

          const additionalDemoReports = createAdditionalDemoReports();
          const { error: additionalReportsError } = await supabase
            .from("interview_report")
            .insert(additionalDemoReports);
          if (additionalReportsError) throw new Error(`Failed to insert additional demo reports: ${additionalReportsError.message}`);

          console.log(`✅ Inserted additional demo data for all 4 role types`);
          console.log(`   subject_expert: /report/${DEMO_REPORT_ID}/chat-log`);
          console.log(`   work_related: /report/${DEMO_REPORT_ID_WORK}/chat-log`);
          console.log(`   daily_life_affected: /report/${DEMO_REPORT_ID_DAILY}/chat-log`);
          console.log(`   general_citizen: /report/${DEMO_REPORT_ID_CITIZEN}/chat-log`);
        }
      }
    } else {
      console.log("⚠️ Skipped interview config (target bill not found)");
    }

    console.log("\n🎉 Database seeding completed successfully!");
    console.log("\n📊 Summary:");
    console.log(`  Council Sessions: ${councilSessionCount}`);
    console.log(`  Committees: ${insertedCommittees.length}`);
    console.log(`  Factions: ${insertedFactions.length}`);
    console.log(`  Tags: ${insertedTags.length}`);
    console.log(`  Bills: ${billCount}`);
    console.log(`  Bill Contents: ${contentCount}`);
    console.log(`  Bill Committees: ${billCommitteeCount}`);
    console.log(`  Faction Stances: ${stanceCount}`);
    console.log(`  Bills-Tags Relations: ${billsTagsCount}`);
    console.log(`  Interview Config: ${interviewConfigData ? 1 : 0}`);
    console.log(`  Interview Questions: ${insertedQuestionsCount}`);
    console.log(`  Interview Sessions: ${insertedSessionsCount}`);
    console.log(`  Interview Messages: ${insertedMessagesCount}`);
    console.log(`  Interview Reports: ${insertedReportsCount}`);
  } catch (error) {
    console.error("❌ Error seeding database:", error);
    process.exit(1);
  }
}

seedDatabase();
