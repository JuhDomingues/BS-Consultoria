import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, RefreshCw, Home, MessageSquare, LogOut } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { Property } from "@/utils/parsePropertyData";
import { PropertyForm } from "@/components/PropertyForm";
import { PropertyCreationDialog } from "@/components/PropertyCreationDialog";
import { AIPropertyForm } from "@/components/AIPropertyForm";
import { PropertyTable } from "@/components/PropertyTable";
import {
  fetchAllPropertiesAdmin,
  createProperty,
  updateProperty,
  deleteProperty,
  togglePropertyActive,
} from "@/services/baserow";
import { clearPropertiesCache } from "@/data/properties";
import { useToast } from "@/hooks/use-toast";

interface Conversation {
  phoneNumber: string;
  messageCount: number;
  lastActivity: string;
  propertyId?: number;
  customerInfo?: any;
}

const Admin = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { logout } = useAuth();
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [creationDialogOpen, setCreationDialogOpen] = useState(false);
  const [manualFormOpen, setManualFormOpen] = useState(false);
  const [aiFormOpen, setAiFormOpen] = useState(false);
  const [editingProperty, setEditingProperty] = useState<Property | null>(null);
  const [formMode, setFormMode] = useState<"create" | "edit">("create");

  // SDR Conversations state
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [conversationsLoading, setConversationsLoading] = useState(false);

  const loadProperties = async () => {
    try {
      setLoading(true);
      const data = await fetchAllPropertiesAdmin();
      setProperties(data);
    } catch (error) {
      console.error('Error loading properties:', error);
      toast({
        title: "Erro ao carregar imóveis",
        description: "Não foi possível carregar a lista de imóveis.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProperties();
  }, []);

  const loadConversations = async () => {
    try {
      setConversationsLoading(true);
      const response = await fetch('http://localhost:3002/api/conversations');
      const data = await response.json();

      if (data.success) {
        setConversations(data.conversations);
      }
    } catch (error) {
      console.error('Error loading conversations:', error);
      toast({
        title: "Erro ao carregar conversas",
        description: "Não foi possível conectar ao servidor SDR.",
        variant: "destructive",
      });
    } finally {
      setConversationsLoading(false);
    }
  };

  const handleCreateProperty = async (data: Partial<Property>) => {
    try {
      await createProperty(data);
      toast({
        title: "Imóvel criado com sucesso!",
        description: "O imóvel foi adicionado ao banco de dados.",
      });
      await loadProperties();
    } catch (error) {
      console.error('Error creating property:', error);
      throw error;
    }
  };

  const handleUpdateProperty = async (data: Partial<Property>) => {
    if (!editingProperty) return;

    try {
      await updateProperty(editingProperty.id, data);
      toast({
        title: "Imóvel atualizado!",
        description: "As alterações foram salvas com sucesso.",
      });
      await loadProperties();
      setEditingProperty(null);
    } catch (error) {
      console.error('Error updating property:', error);
      throw error;
    }
  };

  const handleDeleteProperty = async (id: string) => {
    try {
      await deleteProperty(id);
      toast({
        title: "Imóvel excluído",
        description: "O imóvel foi removido do banco de dados.",
      });
      await loadProperties();
    } catch (error) {
      console.error('Error deleting property:', error);
      toast({
        title: "Erro ao excluir",
        description: "Não foi possível excluir o imóvel.",
        variant: "destructive",
      });
    }
  };

  const handleToggleActive = async (id: string, active: boolean) => {
    try {
      await togglePropertyActive(id, active);

      // Clear cache to force refresh
      clearPropertiesCache();

      toast({
        title: active ? "Imóvel ativado" : "Imóvel desativado",
        description: active
          ? "O imóvel agora está visível no site."
          : "O imóvel foi ocultado do site.",
      });
      await loadProperties();
    } catch (error) {
      console.error('Error toggling property active:', error);
      toast({
        title: "Erro",
        description: "Não foi possível alterar o status do imóvel.",
        variant: "destructive",
      });
    }
  };

  const handleEdit = (property: Property) => {
    setEditingProperty(property);
    setFormMode("edit");
    setManualFormOpen(true);
  };

  const handleCreateNew = () => {
    setCreationDialogOpen(true);
  };

  const handleSelectManual = () => {
    setCreationDialogOpen(false);
    setEditingProperty(null);
    setFormMode("create");
    setManualFormOpen(true);
  };

  const handleSelectAI = () => {
    setCreationDialogOpen(false);
    setAiFormOpen(true);
  };

  const stats = {
    total: properties.length,
    active: properties.filter(p => p.active !== false).length,
    inactive: properties.filter(p => p.active === false).length,
    sale: properties.filter(p => p.category === 'Venda').length,
    rent: properties.filter(p => p.category === 'Locação').length,
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold">Painel de Administração</h1>
            <p className="text-muted-foreground">Gerencie todos os imóveis do site</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => navigate("/")}>
              <Home className="h-4 w-4 mr-2" />
              Voltar ao Site
            </Button>
            <Button variant="outline" onClick={loadProperties} disabled={loading}>
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Atualizar
            </Button>
            <Button onClick={handleCreateNew}>
              <Plus className="h-4 w-4 mr-2" />
              Novo Imóvel
            </Button>
            <Button variant="destructive" onClick={logout}>
              <LogOut className="h-4 w-4 mr-2" />
              Sair
            </Button>
          </div>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="properties" className="w-full">
          <TabsList className="mb-6">
            <TabsTrigger value="properties">Imóveis</TabsTrigger>
            <TabsTrigger value="conversations">
              <MessageSquare className="h-4 w-4 mr-2" />
              Conversas SDR
            </TabsTrigger>
          </TabsList>

          {/* Properties Tab */}
          <TabsContent value="properties">
            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-8">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Total
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.total}</div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Ativos
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-green-600">{stats.active}</div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Inativos
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-gray-400">{stats.inactive}</div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    À Venda
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-blue-600">{stats.sale}</div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Para Locação
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-purple-600">{stats.rent}</div>
                </CardContent>
              </Card>
            </div>

            {/* Properties Table */}
            <Card>
              <CardHeader>
                <CardTitle>Imóveis Cadastrados</CardTitle>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
                    <p className="text-sm text-muted-foreground">Carregando imóveis...</p>
                  </div>
                ) : (
                  <PropertyTable
                    properties={properties}
                    onEdit={handleEdit}
                    onDelete={handleDeleteProperty}
                    onToggleActive={handleToggleActive}
                  />
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Conversations Tab */}
          <TabsContent value="conversations">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
                <CardTitle>Conversas Ativas do SDR</CardTitle>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={loadConversations}
                  disabled={conversationsLoading}
                >
                  <RefreshCw className={`h-4 w-4 mr-2 ${conversationsLoading ? 'animate-spin' : ''}`} />
                  Atualizar
                </Button>
              </CardHeader>
              <CardContent>
                {conversationsLoading ? (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
                    <p className="text-sm text-muted-foreground">Carregando conversas...</p>
                  </div>
                ) : conversations.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-20" />
                    <p>Nenhuma conversa ativa no momento</p>
                    <p className="text-sm mt-2">As conversas aparecerão aqui quando clientes enviarem mensagens</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {conversations.map((conv) => (
                      <Card key={conv.phoneNumber} className="border-l-4 border-l-primary">
                        <CardContent className="pt-6">
                          <div className="flex justify-between items-start">
                            <div>
                              <p className="font-semibold text-lg">📱 {conv.phoneNumber}</p>
                              <p className="text-sm text-muted-foreground mt-1">
                                {conv.messageCount} mensagens
                              </p>
                              {conv.propertyId && (
                                <p className="text-sm text-primary mt-1">
                                  Interessado no imóvel #{conv.propertyId}
                                </p>
                              )}
                            </div>
                            <div className="text-right text-sm text-muted-foreground">
                              <p>Última atividade:</p>
                              <p>{new Date(conv.lastActivity).toLocaleString('pt-BR')}</p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Creation Method Dialog */}
      <PropertyCreationDialog
        open={creationDialogOpen}
        onOpenChange={setCreationDialogOpen}
        onSelectManual={handleSelectManual}
        onSelectAI={handleSelectAI}
      />

      {/* Manual Property Form Dialog */}
      <PropertyForm
        open={manualFormOpen}
        onOpenChange={setManualFormOpen}
        onSubmit={formMode === "create" ? handleCreateProperty : handleUpdateProperty}
        initialData={editingProperty}
        mode={formMode}
      />

      {/* AI Property Form Dialog */}
      <AIPropertyForm
        open={aiFormOpen}
        onOpenChange={setAiFormOpen}
        onSubmit={handleCreateProperty}
      />
    </div>
  );
};

export default Admin;
