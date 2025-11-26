import { useMemo, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { AlertCircle, CheckCircle, Filter, MessageCircle, Send, Users, CheckSquare, Square } from "lucide-react";
import type { Lead } from "@/types/crm";

interface WhatsAppBroadcastDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  leads: Lead[];
  onSuccess?: () => void;
}

interface BroadcastResult {
  total: number;
  sent: number;
  failed: number;
  results: {
    phoneNumber: string;
    status: "sent" | "failed";
    error?: string;
  }[];
}

const QUALITY_OPTIONS = [
  { value: "all", label: "Todas as qualidades" },
  { value: "hot", label: "Somente quentes" },
  { value: "warm", label: "Somente mornos" },
  { value: "cold", label: "Somente frios" },
];

const formatPhone = (phone: string) => {
  const digits = phone.replace(/\D/g, "");
  if (digits.length === 13) {
    return `+${digits.slice(0, 2)} (${digits.slice(2, 4)}) ${digits.slice(4, 9)}-${digits.slice(9)}`;
  }
  if (digits.length === 11) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
  }
  return phone;
};

const applyMessageTemplate = (template: string, lead?: Lead) => {
  if (!template) return "";
  if (!lead) return template;

  const name = lead.name || "";
  const firstName = name ? name.split(" ")[0] : "";

  return template
    .replace(/{{\s*(nome|name)\s*}}/gi, name || firstName || "cliente")
    .replace(/{{\s*(primeiroNome|firstName)\s*}}/gi, firstName || name || "cliente");
};

export function WhatsAppBroadcastDialog({
  open,
  onOpenChange,
  leads,
  onSuccess,
}: WhatsAppBroadcastDialogProps) {
  const { toast } = useToast();
  const [qualityFilter, setQualityFilter] = useState<"all" | "hot" | "warm" | "cold">("all");
  const [tagFilter, setTagFilter] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<BroadcastResult | null>(null);
  const [selectedPhones, setSelectedPhones] = useState<Set<string>>(new Set());

  const allTags = useMemo(() => {
    return Array.from(new Set(leads.flatMap((lead) => lead.tags || []))).sort();
  }, [leads]);

  const filteredLeads = useMemo(() => {
    return leads.filter((lead) => {
      const matchesQuality = qualityFilter === "all" || lead.quality === qualityFilter;
      const matchesTag =
        tagFilter === "all" || (lead.tags && lead.tags.includes(tagFilter));

      const matchesSearch =
        searchTerm === "" ||
        lead.phoneNumber.includes(searchTerm) ||
        (lead.name && lead.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (lead.email && lead.email.toLowerCase().includes(searchTerm.toLowerCase()));

      return matchesQuality && matchesTag && matchesSearch;
    });
  }, [leads, qualityFilter, tagFilter, searchTerm]);

  // Get only selected leads from the filtered ones
  const selectedLeads = useMemo(() => {
    return filteredLeads.filter((lead) => selectedPhones.has(lead.phoneNumber));
  }, [filteredLeads, selectedPhones]);

  const previewLead = selectedLeads[0] || filteredLeads[0];
  const previewMessage = applyMessageTemplate(message, previewLead);

  // Selection handlers
  const toggleSelection = (phoneNumber: string) => {
    setSelectedPhones((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(phoneNumber)) {
        newSet.delete(phoneNumber);
      } else {
        newSet.add(phoneNumber);
      }
      return newSet;
    });
  };

  const selectAll = () => {
    setSelectedPhones(new Set(filteredLeads.map((lead) => lead.phoneNumber)));
  };

  const selectNone = () => {
    setSelectedPhones(new Set());
  };

  const isAllSelected = filteredLeads.length > 0 && selectedPhones.size === filteredLeads.length;

  const handleSend = async () => {
    if (!message.trim()) {
      toast({
        title: "Mensagem obrigatória",
        description: "Digite a mensagem que deseja enviar antes de continuar.",
        variant: "destructive",
      });
      return;
    }

    if (selectedLeads.length === 0) {
      toast({
        title: "Nenhum lead selecionado",
        description: "Selecione ao menos um lead para enviar a mensagem.",
        variant: "destructive",
      });
      return;
    }

    try {
      setSending(true);
      setResult(null);

      const apiUrl = import.meta.env.DEV ? "" : (import.meta.env.VITE_API_URL || "");
      const response = await fetch(`${apiUrl}/api/whatsapp/broadcast`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message,
          recipients: selectedLeads.map((lead) => ({
            phoneNumber: lead.phoneNumber,
            name: lead.name,
          })),
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || "Falha ao enviar mensagens");
      }

      setResult(data);
      toast({
        title: "Campanha enviada!",
        description: `${data.sent} de ${data.total} leads receberam a mensagem.`,
      });

      onSuccess?.();
    } catch (error) {
      console.error("WhatsApp broadcast error:", error);
      toast({
        title: "Erro no envio",
        description:
          error instanceof Error ? error.message : "Não foi possível enviar as mensagens.",
        variant: "destructive",
      });
    } finally {
      setSending(false);
    }
  };

  const handleClose = (state: boolean) => {
    if (!state) {
      setResult(null);
      setMessage("");
      setSearchTerm("");
      setTagFilter("all");
      setQualityFilter("all");
      setSelectedPhones(new Set());
    }
    onOpenChange(state);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle>Envio em Massa pelo WhatsApp</DialogTitle>
          <DialogDescription>
            Selecione os leads, escreva a mensagem e envie notificações personalizadas com um clique.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 py-2">
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardContent className="pt-6 space-y-4">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <MessageCircle className="h-4 w-4" />
                  Use <code className="bg-muted px-1 rounded">{"{{nome}}"}</code> ou{" "}
                  <code className="bg-muted px-1 rounded">{"{{primeiroNome}}"}</code> para personalizar.
                </div>
                <Textarea
                  placeholder="Olá {{nome}}, preparamos novas oportunidades que combinam com o que você procura. Quer que eu te envie os detalhes?"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  className="min-h-[200px]"
                />

                {previewLead ? (
                  <div className="border rounded-lg p-4 bg-muted/40">
                    <div className="flex items-center gap-2 text-sm font-medium mb-2">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      Pré-visualização para {previewLead.name || formatPhone(previewLead.phoneNumber)}
                    </div>
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                      {previewMessage || "Escreva sua mensagem para visualizar aqui."}
                    </p>
                  </div>
                ) : (
                  <div className="border rounded-lg p-4 text-sm text-muted-foreground flex items-center gap-2">
                    <AlertCircle className="h-4 w-4" />
                    Ajuste os filtros para visualizar uma prévia.
                  </div>
                )}
              </CardContent>
            </Card>

            {result && (
              <Card>
                <CardContent className="pt-6 space-y-4">
                  <div className="flex items-center gap-2 text-base font-semibold">
                    <Send className="h-4 w-4 text-primary" />
                    Resultado da campanha
                  </div>
                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div>
                      <p className="text-3xl font-bold text-primary">{result.sent}</p>
                      <p className="text-sm text-muted-foreground">Enviadas</p>
                    </div>
                    <div>
                      <p className="text-3xl font-bold">{result.failed}</p>
                      <p className="text-sm text-muted-foreground">Falhas</p>
                    </div>
                    <div>
                      <p className="text-3xl font-bold">{result.total}</p>
                      <p className="text-sm text-muted-foreground">Total</p>
                    </div>
                  </div>

                  {result.failed > 0 && (
                    <div className="text-sm text-muted-foreground border-t pt-4">
                      <p className="font-medium mb-2">Falhas:</p>
                      <ul className="space-y-1 max-h-28 overflow-y-auto pr-2">
                        {result.results
                          .filter((item) => item.status === "failed")
                          .map((item) => (
                            <li key={item.phoneNumber}>
                              {formatPhone(item.phoneNumber)} - {item.error || "motivo desconhecido"}
                            </li>
                          ))}
                      </ul>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>

          <div className="space-y-4">
            <Card>
              <CardContent className="pt-6 space-y-4">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Filter className="h-4 w-4" />
                  Filtros
                </div>

                <div className="space-y-2">
                  <Label>Busca rápida</Label>
                  <Input
                    placeholder="Nome, e-mail ou telefone"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Qualidade</Label>
                  <Select value={qualityFilter} onValueChange={(value: "all" | "hot" | "warm" | "cold") => setQualityFilter(value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Filtrar por qualidade" />
                    </SelectTrigger>
                    <SelectContent>
                      {QUALITY_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Tag</Label>
                  <Select
                    value={tagFilter}
                    onValueChange={(value) => setTagFilter(value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Filtrar por tag" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todas</SelectItem>
                      {allTags.map((tag) => (
                        <SelectItem key={tag} value={tag}>
                          {tag}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="rounded-lg border p-3 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Leads selecionados</p>
                      <p className="text-2xl font-semibold">
                        {selectedLeads.length}
                        <span className="text-sm text-muted-foreground font-normal ml-1">
                          / {filteredLeads.length}
                        </span>
                      </p>
                    </div>
                    <Users className="h-5 w-5 text-muted-foreground" />
                  </div>

                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={selectAll}
                      disabled={isAllSelected || filteredLeads.length === 0}
                      className="flex-1 h-8"
                    >
                      <CheckSquare className="h-3 w-3 mr-1" />
                      Todos
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={selectNone}
                      disabled={selectedPhones.size === 0}
                      className="flex-1 h-8"
                    >
                      <Square className="h-3 w-3 mr-1" />
                      Nenhum
                    </Button>
                  </div>
                </div>

                <ScrollArea className="h-64 rounded-md border">
                  <div className="p-3 space-y-2">
                    {filteredLeads.map((lead) => (
                      <div
                        key={lead.phoneNumber}
                        className={`flex items-center gap-3 text-sm rounded-md px-3 py-2 cursor-pointer transition-colors ${
                          selectedPhones.has(lead.phoneNumber)
                            ? "bg-primary/10 border border-primary/20"
                            : "bg-muted/50 hover:bg-muted"
                        }`}
                        onClick={() => toggleSelection(lead.phoneNumber)}
                      >
                        <Checkbox
                          checked={selectedPhones.has(lead.phoneNumber)}
                          onCheckedChange={() => toggleSelection(lead.phoneNumber)}
                          onClick={(e) => e.stopPropagation()}
                        />
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{lead.name || formatPhone(lead.phoneNumber)}</p>
                          <p className="text-xs text-muted-foreground truncate">{formatPhone(lead.phoneNumber)}</p>
                        </div>
                        <Badge
                          variant="outline"
                          className={`capitalize text-xs ${
                            lead.quality === 'hot' ? 'bg-red-100 text-red-800 border-red-300' :
                            lead.quality === 'warm' ? 'bg-yellow-100 text-yellow-800 border-yellow-300' :
                            'bg-blue-100 text-blue-800 border-blue-300'
                          }`}
                        >
                          {lead.quality === 'hot' ? 'Quente' : lead.quality === 'warm' ? 'Morno' : 'Frio'}
                        </Badge>
                      </div>
                    ))}
                    {filteredLeads.length === 0 && (
                      <p className="text-xs text-muted-foreground text-center py-8">
                        Nenhum lead corresponde aos filtros atuais.
                      </p>
                    )}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>

            <div className="flex flex-col gap-2">
              <Button
                onClick={handleSend}
                disabled={sending || selectedLeads.length === 0 || !message.trim()}
                className="h-10"
              >
                {sending ? (
                  <span className="flex items-center gap-2">
                    <span className="h-4 w-4 animate-spin rounded-full border-b-2 border-white" />
                    Enviando para {selectedLeads.length}...
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    <Send className="h-4 w-4" />
                    Enviar para {selectedLeads.length} {selectedLeads.length === 1 ? 'lead' : 'leads'}
                  </span>
                )}
              </Button>
              <Button variant="outline" onClick={() => handleClose(false)}>
                Cancelar
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
