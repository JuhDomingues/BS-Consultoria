import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Upload, FileSpreadsheet, AlertCircle, CheckCircle2, X } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";

interface LeadImporterProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

interface ParsedLead {
  name: string;
  phoneNumber: string;
  email?: string;
  tipoTransacao?: string;
  tipoImovel?: string;
  budgetCompra?: string;
  budgetLocacao?: string;
  localizacao?: string;
  prazo?: string;
  financiamento?: string;
  notes?: string;
  status?: 'valid' | 'invalid';
  error?: string;
}

export const LeadImporter = ({ open, onOpenChange, onSuccess }: LeadImporterProps) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [parsedLeads, setParsedLeads] = useState<ParsedLead[]>([]);
  const [importing, setImporting] = useState(false);

  const parseCSV = (text: string): ParsedLead[] => {
    const lines = text.split('\n').filter(line => line.trim());
    if (lines.length === 0) return [];

    // Primeira linha são os headers
    const headers = lines[0].split(',').map(h => h.trim().toLowerCase());

    const leads: ParsedLead[] = [];

    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map(v => v.trim());

      const lead: ParsedLead = {
        name: '',
        phoneNumber: '',
      };

      // Mapear os valores baseado nos headers
      headers.forEach((header, index) => {
        const value = values[index] || '';

        switch(header) {
          case 'nome':
          case 'name':
            lead.name = value;
            break;
          case 'telefone':
          case 'phone':
          case 'phonenumber':
            lead.phoneNumber = value.replace(/\D/g, '');
            break;
          case 'email':
          case 'e-mail':
            lead.email = value;
            break;
          case 'transacao':
          case 'tipotransacao':
          case 'tipo_transacao':
            lead.tipoTransacao = value;
            break;
          case 'tipoimovel':
          case 'tipo_imovel':
          case 'imovel':
            lead.tipoImovel = value;
            break;
          case 'budgetcompra':
          case 'budget_compra':
          case 'orcamentocompra':
            lead.budgetCompra = value;
            break;
          case 'budgetlocacao':
          case 'budget_locacao':
          case 'orcamentolocacao':
            lead.budgetLocacao = value;
            break;
          case 'localizacao':
          case 'localização':
          case 'cidade':
            lead.localizacao = value;
            break;
          case 'prazo':
            lead.prazo = value;
            break;
          case 'financiamento':
            lead.financiamento = value;
            break;
          case 'observacoes':
          case 'observações':
          case 'notes':
          case 'notas':
            lead.notes = value;
            break;
        }
      });

      // Validar lead
      if (!lead.name || !lead.phoneNumber) {
        lead.status = 'invalid';
        lead.error = !lead.name ? 'Nome obrigatório' : 'Telefone obrigatório';
      } else if (lead.phoneNumber.length < 10) {
        lead.status = 'invalid';
        lead.error = 'Telefone inválido';
      } else {
        lead.status = 'valid';
      }

      leads.push(lead);
    }

    return leads;
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    // Validar tipo de arquivo
    const validTypes = ['text/csv', 'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'];
    if (!validTypes.includes(selectedFile.type) && !selectedFile.name.endsWith('.csv')) {
      toast({
        title: "Arquivo inválido",
        description: "Por favor, selecione um arquivo CSV.",
        variant: "destructive",
      });
      return;
    }

    setFile(selectedFile);
    setLoading(true);

    try {
      const text = await selectedFile.text();
      const leads = parseCSV(text);
      setParsedLeads(leads);

      const validCount = leads.filter(l => l.status === 'valid').length;
      const invalidCount = leads.filter(l => l.status === 'invalid').length;

      toast({
        title: "Arquivo processado",
        description: `${validCount} leads válidos, ${invalidCount} inválidos`,
      });
    } catch (error) {
      console.error('Error parsing CSV:', error);
      toast({
        title: "Erro ao processar arquivo",
        description: "Não foi possível ler o arquivo CSV.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleImport = async () => {
    const validLeads = parsedLeads.filter(l => l.status === 'valid');

    if (validLeads.length === 0) {
      toast({
        title: "Nenhum lead válido",
        description: "Não há leads válidos para importar.",
        variant: "destructive",
      });
      return;
    }

    try {
      setImporting(true);
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3003';
      const sdrUrl = apiUrl
        .replace(':3003', ':3002')
        .replace(':3000', ':3002')
        .replace(':3001', ':3002');

      let successCount = 0;
      let errorCount = 0;

      // Importar leads um por um
      for (const lead of validLeads) {
        try {
          // Formatar telefone com código do país
          const cleanPhone = lead.phoneNumber.replace(/\D/g, '');
          const formattedPhone = cleanPhone.startsWith('55')
            ? cleanPhone
            : `55${cleanPhone}`;

          const payload = {
            name: lead.name,
            phoneNumber: formattedPhone,
            email: lead.email || null,
            source: 'import',
            typebotData: {
              tipoTransacao: lead.tipoTransacao || null,
              tipoImovel: lead.tipoImovel || null,
              budgetCompra: lead.budgetCompra || null,
              budgetLocacao: lead.budgetLocacao || null,
              localizacao: lead.localizacao || null,
              prazo: lead.prazo || null,
              financiamento: lead.financiamento || null,
            },
            notes: lead.notes || null,
          };

          const response = await fetch(`${sdrUrl}/api/crm/leads`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload),
          });

          if (response.ok) {
            successCount++;
          } else {
            errorCount++;
          }
        } catch (error) {
          console.error('Error importing lead:', error);
          errorCount++;
        }
      }

      toast({
        title: "Importação concluída!",
        description: `${successCount} leads importados com sucesso. ${errorCount > 0 ? `${errorCount} falharam.` : ''}`,
      });

      // Resetar estado
      setFile(null);
      setParsedLeads([]);
      onSuccess();
      onOpenChange(false);
    } catch (error) {
      console.error('Error importing leads:', error);
      toast({
        title: "Erro na importação",
        description: "Não foi possível importar os leads.",
        variant: "destructive",
      });
    } finally {
      setImporting(false);
    }
  };

  const validCount = parsedLeads.filter(l => l.status === 'valid').length;
  const invalidCount = parsedLeads.filter(l => l.status === 'invalid').length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Importar Leads de CSV</DialogTitle>
          <DialogDescription>
            Faça upload de um arquivo CSV com os dados dos leads
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 flex-1 overflow-hidden flex flex-col">
          {/* Template Info */}
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-blue-500 mt-0.5" />
                <div className="space-y-2 text-sm">
                  <p className="font-medium">Formato do arquivo CSV:</p>
                  <p className="text-muted-foreground">
                    O arquivo deve conter as seguintes colunas (separadas por vírgula):
                  </p>
                  <code className="block bg-gray-100 p-2 rounded text-xs">
                    nome,telefone,email,transacao,tipoimovel,budgetcompra,budgetlocacao,localizacao,prazo,financiamento,observacoes
                  </code>
                  <p className="text-xs text-muted-foreground mt-2">
                    <strong>Campos obrigatórios:</strong> nome, telefone
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* File Upload */}
          {!file && (
            <div className="border-2 border-dashed rounded-lg p-8">
              <div className="flex flex-col items-center gap-4">
                <FileSpreadsheet className="h-12 w-12 text-muted-foreground" />
                <div className="text-center">
                  <p className="font-medium mb-1">Selecione um arquivo CSV</p>
                  <p className="text-sm text-muted-foreground">ou arraste e solte aqui</p>
                </div>
                <label htmlFor="file-upload">
                  <Button type="button" variant="outline" asChild>
                    <span>
                      <Upload className="h-4 w-4 mr-2" />
                      Escolher Arquivo
                    </span>
                  </Button>
                  <input
                    id="file-upload"
                    type="file"
                    accept=".csv"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                </label>
              </div>
            </div>
          )}

          {/* Preview */}
          {file && parsedLeads.length > 0 && (
            <div className="space-y-3 flex-1 overflow-hidden flex flex-col">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FileSpreadsheet className="h-5 w-5" />
                  <span className="font-medium">{file.name}</span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setFile(null);
                    setParsedLeads([]);
                  }}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>

              <div className="flex gap-2">
                <Badge variant="default" className="bg-green-100 text-green-800">
                  <CheckCircle2 className="h-3 w-3 mr-1" />
                  {validCount} válidos
                </Badge>
                {invalidCount > 0 && (
                  <Badge variant="destructive">
                    <AlertCircle className="h-3 w-3 mr-1" />
                    {invalidCount} inválidos
                  </Badge>
                )}
              </div>

              <ScrollArea className="flex-1 border rounded-lg">
                <div className="p-4 space-y-2">
                  {parsedLeads.map((lead, index) => (
                    <Card
                      key={index}
                      className={`${
                        lead.status === 'valid'
                          ? 'border-green-200 bg-green-50/30'
                          : 'border-red-200 bg-red-50/30'
                      }`}
                    >
                      <CardContent className="p-3">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <p className="font-medium">{lead.name || '(sem nome)'}</p>
                            <p className="text-sm text-muted-foreground">
                              {lead.phoneNumber || '(sem telefone)'}
                              {lead.email && ` • ${lead.email}`}
                            </p>
                          </div>
                          {lead.status === 'valid' ? (
                            <CheckCircle2 className="h-5 w-5 text-green-600" />
                          ) : (
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-red-600">{lead.error}</span>
                              <AlertCircle className="h-5 w-5 text-red-600" />
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </ScrollArea>
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setFile(null);
                setParsedLeads([]);
                onOpenChange(false);
              }}
              disabled={importing}
            >
              Cancelar
            </Button>
            {parsedLeads.length > 0 && (
              <Button
                onClick={handleImport}
                disabled={importing || validCount === 0}
              >
                {importing ? "Importando..." : `Importar ${validCount} Lead${validCount !== 1 ? 's' : ''}`}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
