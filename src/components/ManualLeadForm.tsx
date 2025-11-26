import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";

interface ManualLeadFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export const ManualLeadForm = ({ open, onOpenChange, onSuccess }: ManualLeadFormProps) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    phoneNumber: "",
    email: "",
    tipoTransacao: "",
    tipoImovel: "",
    budgetCompra: "",
    budgetLocacao: "",
    localizacao: "",
    prazo: "",
    financiamento: "",
    notes: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validação básica
    if (!formData.name || !formData.phoneNumber) {
      toast({
        title: "Campos obrigatórios",
        description: "Nome e telefone são obrigatórios.",
        variant: "destructive",
      });
      return;
    }

    // Validar formato do telefone (deve ter código do país)
    const cleanPhone = formData.phoneNumber.replace(/\D/g, '');
    if (cleanPhone.length < 11) {
      toast({
        title: "Telefone inválido",
        description: "Digite um telefone válido com DDD (ex: 11999999999).",
        variant: "destructive",
      });
      return;
    }

    try {
      setLoading(true);
      // Use relative URL in development (Vite proxy), absolute in production
      const apiUrl = import.meta.env.DEV ? '' : (import.meta.env.VITE_API_URL || '');

      // Formatar telefone com código do país
      const formattedPhone = cleanPhone.startsWith('55')
        ? cleanPhone
        : `55${cleanPhone}`;

      const payload = {
        name: formData.name,
        phoneNumber: formattedPhone,
        email: formData.email || null,
        source: 'manual',
        typebotData: {
          tipoTransacao: formData.tipoTransacao || null,
          tipoImovel: formData.tipoImovel || null,
          budgetCompra: formData.budgetCompra || null,
          budgetLocacao: formData.budgetLocacao || null,
          localizacao: formData.localizacao || null,
          prazo: formData.prazo || null,
          financiamento: formData.financiamento || null,
        },
        notes: formData.notes || null,
      };

      console.log('📤 Creating lead at:', `${apiUrl}/api/baserow/leads`);
      console.log('📦 Payload:', payload);

      const response = await fetch(`${apiUrl}/api/baserow/leads`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Erro ao criar lead');
      }

      toast({
        title: "Lead criado com sucesso!",
        description: `${formData.name} foi adicionado ao CRM.`,
      });

      // Resetar formulário
      setFormData({
        name: "",
        phoneNumber: "",
        email: "",
        tipoTransacao: "",
        tipoImovel: "",
        budgetCompra: "",
        budgetLocacao: "",
        localizacao: "",
        prazo: "",
        financiamento: "",
        notes: "",
      });

      onSuccess();
      onOpenChange(false);
    } catch (error) {
      console.error('Error creating lead:', error);
      toast({
        title: "Erro ao criar lead",
        description: error instanceof Error ? error.message : "Não foi possível criar o lead.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Adicionar Lead Manualmente</DialogTitle>
          <DialogDescription>
            Preencha os dados do lead para adicionar ao CRM
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          {/* Informações Básicas */}
          <div className="space-y-4 p-4 border rounded-lg">
            <h3 className="font-semibold text-sm">Informações de Contato</h3>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">
                  Nome Completo <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="João da Silva"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="phoneNumber">
                  Telefone (com DDD) <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="phoneNumber"
                  value={formData.phoneNumber}
                  onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
                  placeholder="11999999999"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="joao@email.com"
              />
            </div>
          </div>

          {/* Preferências do Cliente */}
          <div className="space-y-4 p-4 border rounded-lg">
            <h3 className="font-semibold text-sm">Preferências do Cliente</h3>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="tipoTransacao">Tipo de Transação</Label>
                <Select
                  value={formData.tipoTransacao}
                  onValueChange={(value) => setFormData({ ...formData, tipoTransacao: value })}
                >
                  <SelectTrigger id="tipoTransacao">
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Compra">Compra</SelectItem>
                    <SelectItem value="Locação">Locação</SelectItem>
                    <SelectItem value="Ambos">Ambos</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="tipoImovel">Tipo de Imóvel</Label>
                <Select
                  value={formData.tipoImovel}
                  onValueChange={(value) => setFormData({ ...formData, tipoImovel: value })}
                >
                  <SelectTrigger id="tipoImovel">
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Casa">Casa</SelectItem>
                    <SelectItem value="Apartamento">Apartamento</SelectItem>
                    <SelectItem value="Terreno">Terreno</SelectItem>
                    <SelectItem value="Comercial">Comercial</SelectItem>
                    <SelectItem value="Rural">Rural</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="budgetCompra">Orçamento para Compra</Label>
                <Input
                  id="budgetCompra"
                  value={formData.budgetCompra}
                  onChange={(e) => setFormData({ ...formData, budgetCompra: e.target.value })}
                  placeholder="R$ 500.000"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="budgetLocacao">Orçamento para Locação</Label>
                <Input
                  id="budgetLocacao"
                  value={formData.budgetLocacao}
                  onChange={(e) => setFormData({ ...formData, budgetLocacao: e.target.value })}
                  placeholder="R$ 2.500/mês"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="localizacao">Localização Desejada</Label>
              <Input
                id="localizacao"
                value={formData.localizacao}
                onChange={(e) => setFormData({ ...formData, localizacao: e.target.value })}
                placeholder="Bairro, Cidade"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="prazo">Prazo</Label>
                <Select
                  value={formData.prazo}
                  onValueChange={(value) => setFormData({ ...formData, prazo: value })}
                >
                  <SelectTrigger id="prazo">
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Urgente (até 1 mês)">Urgente (até 1 mês)</SelectItem>
                    <SelectItem value="Curto prazo (1-3 meses)">Curto prazo (1-3 meses)</SelectItem>
                    <SelectItem value="Médio prazo (3-6 meses)">Médio prazo (3-6 meses)</SelectItem>
                    <SelectItem value="Longo prazo (6+ meses)">Longo prazo (6+ meses)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="financiamento">Financiamento</Label>
                <Select
                  value={formData.financiamento}
                  onValueChange={(value) => setFormData({ ...formData, financiamento: value })}
                >
                  <SelectTrigger id="financiamento">
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Sim">Sim</SelectItem>
                    <SelectItem value="Não">Não</SelectItem>
                    <SelectItem value="Talvez">Talvez</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Observações */}
          <div className="space-y-2">
            <Label htmlFor="notes">Observações</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Informações adicionais sobre o lead..."
              rows={3}
            />
          </div>

          {/* Botões */}
          <div className="flex justify-end gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Criando..." : "Criar Lead"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
