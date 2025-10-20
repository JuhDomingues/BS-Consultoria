import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import {
  User,
  Bot,
  X,
  Calendar,
  MessageCircle,
  Clock,
  Home as HomeIcon,
  RefreshCw
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Message {
  id: number;
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: string;
}

interface ConversationData {
  phoneNumber: string;
  customer: {
    firstContact: string;
    lastContact: string;
    totalMessages: number;
    daysSinceFirstContact: number;
    isActive: boolean;
  };
  conversation: {
    propertyId?: number;
    createdAt: string;
    messageCount: number;
    messages: Message[];
  };
}

interface ConversationViewerProps {
  phoneNumber: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ConversationViewer({ phoneNumber, open, onOpenChange }: ConversationViewerProps) {
  const [data, setData] = useState<ConversationData | null>(null);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const loadConversation = async () => {
    if (!phoneNumber) return;

    try {
      setLoading(true);
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001';
      const sdrUrl = apiUrl.replace(':3000', ':3002').replace(':3001', ':3002');
      const response = await fetch(`${sdrUrl}/api/conversations/${phoneNumber}`);
      const result = await response.json();

      if (result.success) {
        setData(result);
      } else {
        throw new Error(result.error || 'Failed to load conversation');
      }
    } catch (error) {
      console.error('Error loading conversation:', error);
      toast({
        title: "Erro ao carregar conversa",
        description: "Não foi possível carregar o histórico da conversa.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open && phoneNumber) {
      loadConversation();
    }
  }, [open, phoneNumber]);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatPhoneNumber = (phone: string) => {
    // Format: +55 (11) 99999-9999
    const cleaned = phone.replace(/\D/g, '');
    if (cleaned.length === 13) {
      return `+${cleaned.slice(0, 2)} (${cleaned.slice(2, 4)}) ${cleaned.slice(4, 9)}-${cleaned.slice(9)}`;
    }
    return phone;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <DialogTitle className="text-xl">Histórico de Conversa</DialogTitle>
              <DialogDescription className="mt-1">
                {phoneNumber && formatPhoneNumber(phoneNumber)}
              </DialogDescription>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onOpenChange(false)}
              className="h-8 w-8"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : data ? (
          <div className="flex flex-col gap-4 flex-1 min-h-0">
            {/* Customer Info Card */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 p-4 bg-muted rounded-lg">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">Primeiro contato</p>
                  <p className="text-sm font-medium">
                    {new Date(data.customer.firstContact).toLocaleDateString('pt-BR')}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">Último contato</p>
                  <p className="text-sm font-medium">
                    {formatDate(data.customer.lastContact)}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <MessageCircle className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">Total de mensagens</p>
                  <p className="text-sm font-medium">{data.customer.totalMessages}</p>
                </div>
              </div>

              {data.conversation.propertyId && (
                <div className="flex items-center gap-2">
                  <HomeIcon className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground">Imóvel de interesse</p>
                    <p className="text-sm font-medium">#{data.conversation.propertyId}</p>
                  </div>
                </div>
              )}
            </div>

            {/* Status Badge */}
            <div className="flex items-center gap-2">
              <Badge variant={data.customer.isActive ? "default" : "secondary"}>
                {data.customer.isActive ? "Conversa Ativa" : "Conversa Inativa"}
              </Badge>
              <Badge variant="outline">
                {data.customer.daysSinceFirstContact === 0
                  ? "Novo hoje"
                  : `${data.customer.daysSinceFirstContact} dias de histórico`}
              </Badge>
              <Button
                variant="ghost"
                size="sm"
                onClick={loadConversation}
                disabled={loading}
                className="ml-auto"
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                Atualizar
              </Button>
            </div>

            {/* Messages */}
            <ScrollArea className="flex-1 pr-4">
              <div className="space-y-4 pb-4">
                {data.conversation.messages.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <MessageCircle className="h-12 w-12 mx-auto mb-2 opacity-20" />
                    <p>Nenhuma mensagem nesta conversa ainda</p>
                  </div>
                ) : (
                  data.conversation.messages.map((message) => (
                    <div
                      key={message.id}
                      className={`flex gap-3 ${
                        message.role === 'user' ? 'flex-row-reverse' : ''
                      }`}
                    >
                      {/* Avatar */}
                      <div
                        className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                          message.role === 'user'
                            ? 'bg-primary text-primary-foreground'
                            : message.role === 'assistant'
                            ? 'bg-blue-500 text-white'
                            : 'bg-muted text-muted-foreground'
                        }`}
                      >
                        {message.role === 'user' ? (
                          <User className="h-4 w-4" />
                        ) : message.role === 'assistant' ? (
                          <Bot className="h-4 w-4" />
                        ) : (
                          <MessageCircle className="h-4 w-4" />
                        )}
                      </div>

                      {/* Message Bubble */}
                      <div
                        className={`flex-1 max-w-[80%] ${
                          message.role === 'user' ? 'text-right' : ''
                        }`}
                      >
                        <div
                          className={`inline-block px-4 py-2 rounded-lg ${
                            message.role === 'user'
                              ? 'bg-primary text-primary-foreground'
                              : message.role === 'assistant'
                              ? 'bg-blue-50 text-blue-900 border border-blue-200'
                              : 'bg-muted text-muted-foreground text-xs'
                          }`}
                        >
                          {message.role === 'system' && (
                            <p className="text-xs font-semibold mb-1 opacity-70">CONTEXTO DO SISTEMA</p>
                          )}
                          <p className="whitespace-pre-wrap break-words">{message.content}</p>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </ScrollArea>
          </div>
        ) : (
          <div className="text-center py-12 text-muted-foreground">
            <p>Nenhum dado disponível</p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
