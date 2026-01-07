import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Phone, Mail, Calendar, TrendingUp, Home, DollarSign, MapPin, Clock, FileText, User, Bot, MessageCircle, RefreshCw, Edit, Save, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TagManager } from "@/components/TagManager";
import type { Lead } from "@/types/crm";
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

interface LeadDetailsDialogProps {
  lead: Lead | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function LeadDetailsDialog({ lead, open, onOpenChange }: LeadDetailsDialogProps) {
  const { toast } = useToast();
  const [conversationData, setConversationData] = useState<ConversationData | null>(null);
  const [conversationLoading, setConversationLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editedName, setEditedName] = useState('');
  const [editedEmail, setEditedEmail] = useState('');
  const [editedObservations, setEditedObservations] = useState('');
  const [editedQuality, setEditedQuality] = useState<'hot' | 'warm' | 'cold'>('cold');
  const [editedTags, setEditedTags] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  const loadConversation = async () => {
    if (!lead) return;

    try {
      setConversationLoading(true);
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3003';
      const sdrUrl = apiUrl
        .replace(':3003', ':3002')
        .replace(':3000', ':3002')
        .replace(':3001', ':3002');
      const response = await fetch(`${sdrUrl}/api/conversations/${lead.phoneNumber}`);
      const result = await response.json();

      if (result.success) {
        setConversationData(result);
      }
    } catch (error) {
      console.error('Error loading conversation:', error);
      // Silent fail - conversation might not exist
      setConversationData(null);
    } finally {
      setConversationLoading(false);
    }
  };

  useEffect(() => {
    if (open && lead) {
      loadConversation();
      // Initialize edit form with current values
      setEditedName(lead.name || '');
      setEditedEmail(lead.email || '');
      setEditedObservations(lead.observations || '');
      setEditedQuality(lead.quality || 'cold');
      setEditedTags(lead.tags || []);
      setIsEditing(false);
    }
  }, [open, lead?.phoneNumber]);

  const handleSaveChanges = async () => {
    if (!lead) return;

    try {
      setIsSaving(true);

      // Update lead in Baserow via backend
      const apiUrl = import.meta.env.DEV ? '' : (import.meta.env.VITE_API_URL || '');
      const response = await fetch(`${apiUrl}/api/baserow/leads/phone/${lead.phoneNumber}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: editedName.trim() || null,
          email: editedEmail.trim() || null,
          observations: editedObservations.trim() || null,
          quality: editedQuality,
          tags: editedTags,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to update lead');
      }

      toast({
        title: "Lead atualizado!",
        description: "As informações foram salvas com sucesso.",
      });

      setIsEditing(false);

      // Reload parent component to reflect changes
      window.location.reload();
    } catch (error) {
      console.error('Error saving lead:', error);
      toast({
        title: "Erro ao salvar",
        description: "Não foi possível atualizar as informações do lead.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancelEdit = () => {
    // Reset to original values
    setEditedName(lead?.name || '');
    setEditedEmail(lead?.email || '');
    setEditedObservations(lead?.observations || '');
    setEditedQuality(lead?.quality || 'cold');
    setEditedTags(lead?.tags || []);
    setIsEditing(false);
  };

  if (!lead) return null;

  const formatDateTime = (dateString: string) => {
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
    const cleaned = phone.replace(/\D/g, '');
    if (cleaned.length === 13) {
      return `+${cleaned.slice(0, 2)} (${cleaned.slice(2, 4)}) ${cleaned.slice(4, 9)}-${cleaned.slice(9)}`;
    }
    return phone;
  };

  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: 'long',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return dateString;
    }
  };

  const getQualityColor = (quality: 'hot' | 'warm' | 'cold') => {
    switch (quality) {
      case 'hot':
        return 'bg-red-100 text-red-800 border-red-300';
      case 'warm':
        return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'cold':
        return 'bg-blue-100 text-blue-800 border-blue-300';
    }
  };

  const getQualityLabel = (quality: 'hot' | 'warm' | 'cold') => {
    switch (quality) {
      case 'hot':
        return 'Quente';
      case 'warm':
        return 'Morno';
      case 'cold':
        return 'Frio';
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <DialogTitle className="text-2xl">
                {lead.name || 'Lead sem nome'}
              </DialogTitle>
              <DialogDescription>
                Visualização completa dos dados do lead
              </DialogDescription>
            </div>
            <div className="flex gap-2">
              {isEditing ? (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleCancelEdit}
                    disabled={isSaving}
                  >
                    <X className="h-4 w-4 mr-2" />
                    Cancelar
                  </Button>
                  <Button
                    variant="default"
                    size="sm"
                    onClick={handleSaveChanges}
                    disabled={isSaving}
                  >
                    {isSaving ? (
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    ) : (
                      <Save className="h-4 w-4 mr-2" />
                    )}
                    Salvar
                  </Button>
                </>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsEditing(true)}
                >
                  <Edit className="h-4 w-4 mr-2" />
                  Editar
                </Button>
              )}
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-6 mt-4">
          {/* Status e Qualificação */}
          <Card>
            <CardContent className="pt-6">
              {isEditing ? (
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="edit-quality">Qualidade do Lead</Label>
                    <Select value={editedQuality} onValueChange={(value: 'hot' | 'warm' | 'cold') => setEditedQuality(value)}>
                      <SelectTrigger className="mt-1">
                        <SelectValue placeholder="Selecione a qualidade" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="hot">🔥 Quente - Alta prioridade</SelectItem>
                        <SelectItem value="warm">🌡️ Morno - Média prioridade</SelectItem>
                        <SelectItem value="cold">❄️ Frio - Baixa prioridade</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
                    <TrendingUp className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="text-sm text-muted-foreground">Score Atual</p>
                      <p className="font-medium">{lead.score} pontos</p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <Badge className={getQualityColor(lead.quality)} style={{ fontSize: '14px', padding: '6px 12px' }}>
                      <TrendingUp className="h-4 w-4 mr-1" />
                      {getQualityLabel(lead.quality)} - {lead.score} pontos
                    </Badge>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Informações de Contato */}
          <Card>
            <CardContent className="pt-6">
              <h3 className="font-semibold text-lg mb-4">Informações de Contato</h3>
              {isEditing ? (
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="edit-name">Nome</Label>
                    <Input
                      id="edit-name"
                      value={editedName}
                      onChange={(e) => setEditedName(e.target.value)}
                      placeholder="Nome do lead"
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="edit-phone">Telefone (não editável)</Label>
                    <Input
                      id="edit-phone"
                      value={formatPhoneNumber(lead.phoneNumber)}
                      disabled
                      className="mt-1 bg-muted"
                    />
                  </div>
                  <div>
                    <Label htmlFor="edit-email">Email</Label>
                    <Input
                      id="edit-email"
                      type="email"
                      value={editedEmail}
                      onChange={(e) => setEditedEmail(e.target.value)}
                      placeholder="email@exemplo.com"
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label>Total de Mensagens</Label>
                    <Input
                      value={lead.totalMessages}
                      disabled
                      className="mt-1 bg-muted"
                    />
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <User className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="text-sm text-muted-foreground">Nome</p>
                      <p className="font-medium">{lead.name || 'Nome não informado'}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Phone className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="text-sm text-muted-foreground">Telefone</p>
                      <p className="font-medium">{formatPhoneNumber(lead.phoneNumber)}</p>
                    </div>
                  </div>
                  {(lead.email || isEditing) && (
                    <div className="flex items-center gap-3">
                      <Mail className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <p className="text-sm text-muted-foreground">Email</p>
                        <p className="font-medium">{lead.email || 'Não informado'}</p>
                      </div>
                    </div>
                  )}
                  <div className="flex items-center gap-3">
                    <FileText className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="text-sm text-muted-foreground">Total de Mensagens</p>
                      <p className="font-medium">{lead.totalMessages}</p>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Dados do Formulário Typebot */}
          {lead.typebotData && Object.values(lead.typebotData).some(v => v !== null && v !== undefined && v !== '') && (
            <Card>
              <CardContent className="pt-6">
                <h3 className="font-semibold text-lg mb-4">Preferências do Cliente</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {lead.typebotData.tipoTransacao && (
                    <div className="flex items-start gap-3">
                      <Home className="h-5 w-5 text-muted-foreground mt-0.5" />
                      <div>
                        <p className="text-sm text-muted-foreground">Tipo de Transação</p>
                        <p className="font-medium">{lead.typebotData.tipoTransacao}</p>
                      </div>
                    </div>
                  )}
                  {lead.typebotData.tipoImovel && (
                    <div className="flex items-start gap-3">
                      <Home className="h-5 w-5 text-muted-foreground mt-0.5" />
                      <div>
                        <p className="text-sm text-muted-foreground">Tipo de Imóvel</p>
                        <p className="font-medium">{lead.typebotData.tipoImovel}</p>
                      </div>
                    </div>
                  )}
                  {lead.typebotData.budgetCompra && (
                    <div className="flex items-start gap-3">
                      <DollarSign className="h-5 w-5 text-muted-foreground mt-0.5" />
                      <div>
                        <p className="text-sm text-muted-foreground">Orçamento para Compra</p>
                        <p className="font-medium">{lead.typebotData.budgetCompra}</p>
                      </div>
                    </div>
                  )}
                  {lead.typebotData.budgetLocacao && (
                    <div className="flex items-start gap-3">
                      <DollarSign className="h-5 w-5 text-muted-foreground mt-0.5" />
                      <div>
                        <p className="text-sm text-muted-foreground">Orçamento para Locação</p>
                        <p className="font-medium">{lead.typebotData.budgetLocacao}</p>
                      </div>
                    </div>
                  )}
                  {lead.typebotData.localizacao && (
                    <div className="flex items-start gap-3">
                      <MapPin className="h-5 w-5 text-muted-foreground mt-0.5" />
                      <div>
                        <p className="text-sm text-muted-foreground">Localização Desejada</p>
                        <p className="font-medium">{lead.typebotData.localizacao}</p>
                      </div>
                    </div>
                  )}
                  {lead.typebotData.prazo && (
                    <div className="flex items-start gap-3">
                      <Clock className="h-5 w-5 text-muted-foreground mt-0.5" />
                      <div>
                        <p className="text-sm text-muted-foreground">Prazo</p>
                        <p className="font-medium">{lead.typebotData.prazo}</p>
                      </div>
                    </div>
                  )}
                  {lead.typebotData.financiamento && (
                    <div className="flex items-start gap-3">
                      <DollarSign className="h-5 w-5 text-muted-foreground mt-0.5" />
                      <div>
                        <p className="text-sm text-muted-foreground">Financiamento</p>
                        <p className="font-medium">{lead.typebotData.financiamento}</p>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Indicadores de Qualidade */}
          {lead.indicators && lead.indicators.length > 0 && (
            <Card>
              <CardContent className="pt-6">
                <h3 className="font-semibold text-lg mb-4">Indicadores de Qualidade</h3>
                <div className="flex flex-wrap gap-2">
                  {lead.indicators.map((indicator, idx) => (
                    <Badge key={idx} variant="secondary">
                      {indicator}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Imóvel de Interesse */}
          {lead.propertyId && (
            <Card>
              <CardContent className="pt-6">
                <h3 className="font-semibold text-lg mb-4">Interesse em Imóvel</h3>
                <div className="flex items-center gap-3">
                  <Home className="h-5 w-5 text-primary" />
                  <div>
                    <p className="text-sm text-muted-foreground">ID do Imóvel</p>
                    <p className="font-medium text-primary">#{lead.propertyId}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Observações */}
          {(lead.observations && lead.observations.trim() !== '') || isEditing ? (
            <Card>
              <CardContent className="pt-6">
                <h3 className="font-semibold text-lg mb-4">Observações</h3>
                {isEditing ? (
                  <div>
                    <Textarea
                      value={editedObservations}
                      onChange={(e) => setEditedObservations(e.target.value)}
                      placeholder="Adicione observações sobre este lead..."
                      className="min-h-[100px]"
                    />
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                    {lead.observations || 'Nenhuma observação registrada'}
                  </p>
                )}
              </CardContent>
            </Card>
          ) : null}

          {/* Tags */}
          <Card>
            <CardContent className="pt-6">
              <h3 className="font-semibold text-lg mb-4">Tags</h3>
              <TagManager
                tags={isEditing ? editedTags : (lead.tags || [])}
                onChange={setEditedTags}
                readOnly={!isEditing}
              />
            </CardContent>
          </Card>

          {/* Histórico de Conversas */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-lg">Histórico de Conversas</h3>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={loadConversation}
                  disabled={conversationLoading}
                >
                  <RefreshCw className={`h-4 w-4 mr-2 ${conversationLoading ? 'animate-spin' : ''}`} />
                  Atualizar
                </Button>
              </div>

              {conversationLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                </div>
              ) : conversationData && conversationData.conversation.messages.length > 0 ? (
                <div className="space-y-4">
                  {/* Stats da Conversa */}
                  <div className="grid grid-cols-2 gap-3 p-3 bg-muted rounded-lg text-sm">
                    <div>
                      <p className="text-xs text-muted-foreground">Total de Mensagens</p>
                      <p className="font-medium">{conversationData.customer.totalMessages}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Último Contato</p>
                      <p className="font-medium">{formatDateTime(conversationData.customer.lastContact)}</p>
                    </div>
                  </div>

                  {/* Mensagens */}
                  <ScrollArea className="h-[300px] pr-4">
                    <div className="space-y-3">
                      {conversationData.conversation.messages.map((message) => (
                        <div
                          key={message.id}
                          className={`flex gap-2 ${
                            message.role === 'user' ? 'flex-row-reverse' : ''
                          }`}
                        >
                          {/* Avatar */}
                          <div
                            className={`flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-xs ${
                              message.role === 'user'
                                ? 'bg-primary text-primary-foreground'
                                : message.role === 'assistant'
                                ? 'bg-blue-500 text-white'
                                : 'bg-muted text-muted-foreground'
                            }`}
                          >
                            {message.role === 'user' ? (
                              <User className="h-3 w-3" />
                            ) : message.role === 'assistant' ? (
                              <Bot className="h-3 w-3" />
                            ) : (
                              <MessageCircle className="h-3 w-3" />
                            )}
                          </div>

                          {/* Message Bubble */}
                          <div
                            className={`flex-1 max-w-[75%] ${
                              message.role === 'user' ? 'text-right' : ''
                            }`}
                          >
                            <div
                              className={`inline-block px-3 py-2 rounded-lg text-sm ${
                                message.role === 'user'
                                  ? 'bg-primary text-primary-foreground'
                                  : message.role === 'assistant'
                                  ? 'bg-blue-50 text-blue-900 border border-blue-200'
                                  : 'bg-muted text-muted-foreground text-xs'
                              }`}
                            >
                              {message.role === 'system' && (
                                <p className="text-xs font-semibold mb-1 opacity-70">SISTEMA</p>
                              )}
                              <p className="whitespace-pre-wrap break-words">{message.content}</p>
                              <p className="text-xs opacity-60 mt-1">
                                {new Date(message.timestamp).toLocaleTimeString('pt-BR', {
                                  hour: '2-digit',
                                  minute: '2-digit'
                                })}
                              </p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <MessageCircle className="h-10 w-10 mx-auto mb-2 opacity-20" />
                  <p className="text-sm">Nenhuma conversa registrada com este lead</p>
                </div>
              )}
            </CardContent>
          </Card>

          <Separator />

          {/* Datas */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            {lead.createdAt && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Calendar className="h-4 w-4" />
                <div>
                  <span className="font-medium">Cadastrado em:</span>{' '}
                  {formatDate(lead.createdAt)}
                </div>
              </div>
            )}
            <div className="flex items-center gap-2 text-muted-foreground">
              <Calendar className="h-4 w-4" />
              <div>
                <span className="font-medium">Última avaliação:</span>{' '}
                {formatDate(lead.lastEvaluated)}
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
