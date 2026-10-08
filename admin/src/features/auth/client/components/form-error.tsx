import { AlertCircle } from "lucide-react";

/** フォームの下に出すエラー */
export function FormError({ message }: { message: string }) {
  return (
    <div
      role="alert"
      className="flex items-center space-x-2 p-3 text-sm text-red-800 bg-red-50 border border-red-200 rounded-md"
    >
      <AlertCircle className="h-4 w-4 shrink-0" />
      <span>{message}</span>
    </div>
  );
}
