export interface Lead {
  phoneNumber: string;
  name: string | null;
  email: string | null;
  score: number;
  quality: 'hot' | 'warm' | 'cold';
  indicators: string[];
  lastEvaluated: string;
  totalMessages: number;
  propertyId?: number;
  source: string;
  typebotData?: {
    tipoTransacao?: string;
    tipoImovel?: string;
    budgetCompra?: string;
    budgetLocacao?: string;
    localizacao?: string;
    prazo?: string;
    financiamento?: string;
  } | null;
  observations?: string;
  createdAt?: string;
  tags?: string[];
}
