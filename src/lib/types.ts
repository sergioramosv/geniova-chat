export interface ChatMessage {
  id: string;
  department: "DOCTOR" | "ADMIN";
  message: string;
  user: number;
  user_name: string;
  timestamp: number;
}
