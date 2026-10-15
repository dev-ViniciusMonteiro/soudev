export type AgentStatus =
  | 'aguardando' // contratado, esperando a missão começar
  | 'trabalhando' // gerando o relatório
  | 'entregue' // relatório entregue, aguardando o líder
  | 'refazendo' // o líder pediu para refazer
  | 'ok' // missão aprovada: contrato concluído
  | 'encerrado' // contrato terminou sem aprovação
  | 'erro';

export interface Report {
  round: number;
  prompt: string; // o pedido exato enviado ao agente nesta rodada
  content: string; // relatório em Markdown
  model: string;
  tokensIn: number;
  tokensOut: number;
  cost: number; // US$
  at: string;
}

export interface Feedback {
  round: number;
  ok: boolean;
  feedback: string;
  newPrompt: string;
}

export interface Agent {
  id: string;
  desk: number; // 0..5
  name: string;
  roleId: string;
  model: string;
  task: string;
  status: AgentStatus;
  reports: Report[];
  feedback: Feedback[];
  hiredAt: string;
}

export interface Evaluation {
  id: string;
  ok: boolean;
  feedback: string;
  newPrompt: string;
}

export interface LeaderReview {
  round: number;
  approved: boolean;
  analysis: string;
  solution: string;
  evaluations: Evaluation[];
  model: string;
  cost: number;
  at: string;
}

export type RunStatus = 'rodando' | 'aprovada' | 'nao_aprovada' | 'cancelada' | 'erro';

export interface MissionRun {
  id: string;
  objective: string;
  status: RunStatus;
  round: number;
  maxRounds: number;
  startedAt: string;
  finishedAt?: string;
  reviews: LeaderReview[];
  error?: string;
  doc?: string;
  totalCost: number;
}

export interface Settings {
  leaderModel: string;
  maxRounds: number;
  pauseSeconds: number;
  freeOnly: boolean;
  demo: boolean;
  useFallbacks: boolean; // modelos grátis reserva quando o escolhido está sobrecarregado
}

export interface ModelInfo {
  id: string;
  name: string;
  promptPrice: number; // US$ por token
  completionPrice: number;
  context: number;
  free: boolean;
}
