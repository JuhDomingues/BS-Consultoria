import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Plus, RefreshCw, Home, MessageSquare, LogOut, Search, Eye, Filter } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { Property } from "@/utils/parsePropertyData";
import { PropertyForm } from "@/components/PropertyForm";
import { PropertyCreationDialog } from "@/components/PropertyCreationDialog";
import { AIPropertyForm } from "@/components/AIPropertyForm";
import { PropertyTable } from "@/components/PropertyTable";
import { ConversationViewer } from "@/components/ConversationViewer";
import { SDRMetrics } from "@/components/SDRMetrics";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  fetchAllPropertiesAdmin,
  createProperty,
  updateProperty,
  deleteProperty,
  togglePropertyActive,
  movePropertyImages,
} from "@/services/baserow";
import { clearPropertiesCache } from "@/data/properties";
import { useToast } from "@/hooks/use-toast";

interface Conversation {
  phoneNumber: string;
  firstContact: string;
  lastContact: string;
  totalMessages: number;
  messageCount: number;
  propertyId?: number;
  hasActiveConversation: boolean;
  conversationAge?: number | null;
}

interface SDRStats {
  totalCustomers: number;
  activeConversations: number;
  totalInteractions: number;
  customersToday: number;
  customersThisWeek: number;
  propertiesWithInterest: number;
  avgMessagesPerCustomer: number;
  redis: {
    connected: boolean;
    customers: number;
    activeConversations: number;
  };
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
  const [sdrStats, setSdrStats] = useState<SDRStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(false);
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null);
  const [conversationViewerOpen, setConversationViewerOpen] = useState(false);

  // Filters for conversations
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");

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

  const loadSDRStats = async () => {
    try {
      setStatsLoading(true);
      const response = await fetch('http://localhost:3002/api/sdr-stats');
      const data = await response.json();

      if (data.success) {
        setSdrStats(data.stats);
      }
    } catch (error) {
      console.error('Error loading SDR stats:', error);
    } finally {
      setStatsLoading(false);
    }
  };

  const loadAllSDRData = () => {
    loadConversations();
    loadSDRStats();
  };

  // Auto-refresh conversations every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      loadConversations();
      loadSDRStats();
    }, 30000); // 30 seconds

    return () => clearInterval(interval);
  }, []);

  const handleViewConversation = (phoneNumber: string) => {
    setSelectedConversation(phoneNumber);
    setConversationViewerOpen(true);
  };

  // Filter conversations
  const filteredConversations = conversations.filter((conv) => {
    const matchesSearch = conv.phoneNumber.includes(searchQuery);
    const matchesStatus =
      statusFilter === "all" ||
      (statusFilter === "active" && conv.hasActiveConversation) ||
      (statusFilter === "inactive" && !conv.hasActiveConversation);

    return matchesSearch && matchesStatus;
  });

  const formatPhoneNumber = (phone: string) => {
    const cleaned = phone.replace(/\D/g, '');
    if (cleaned.length === 13) {
      return `+${cleaned.slice(0, 2)} (${cleaned.slice(2, 4)}) ${cleaned.slice(4, 9)}-${cleaned.slice(9)}`;
    }
    return phone;
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'Agora mesmo';
    if (diffMins < 60) return `${diffMins}min atrás`;
    if (diffHours < 24) return `${diffHours}h atrás`;
    if (diffDays === 1) return 'Ontem';
    if (diffDays < 7) return `${diffDays} dias atrás`;
    return date.toLocaleDateString('pt-BR');
  };

  const handleCreateProperty = async (data: Partial<Property>) => {
    try {
      const tempId = data.id; // Save temporary ID (temp_XXXXX)
      const hasImages = data.images && data.images.length > 0;

      console.log('Creating property with tempId:', tempId, 'hasImages:', hasImages);

      // 1. Create property in Baserow (returns property with real ID)
      const newProperty = await createProperty(data);
      const realId = newProperty.id;

      console.log('Property created with realId:', realId);

      // 2. If property had temporary ID and images, move them to real ID folder
      if (tempId && tempId.startsWith('temp_') && hasImages) {
        console.log(`Moving images from ${tempId} to ${realId}...`);

        try {
          // Move images from temp folder to real folder
          const newUrls = await movePropertyImages(tempId, realId);

          console.log('Images moved successfully. New URLs:', newUrls);

          // 3. Update Baserow with new image URLs
          if (newUrls && newUrls.length > 0) {
            await updateProperty(realId, { images: newUrls });
            console.log('Image URLs updated in Baserow');
          }
        } catch (moveError) {
          console.error('Error moving images:', moveError);
          // Don't fail the whole operation if move fails
          toast({
            title: "Atenção",
            description: "Imóvel criado, mas houve um erro ao mover as imagens. Verifique as URLs.",
            variant: "destructive",
          });
        }
      }

      toast({
        title: "Imóvel criado com sucesso!",
        description: `O imóvel foi adicionado ao banco de dados com ID ${realId}.`,
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
            {/* SDR Metrics */}
            <SDRMetrics stats={sdrStats} loading={statsLoading} />

            {/* Filters and Actions */}
            <Card className="mb-4">
              <CardContent className="pt-6">
                <div className="flex flex-col md:flex-row gap-4">
                  <div className="flex-1 relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Buscar por número de telefone..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                  <Select value={statusFilter} onValueChange={(value: any) => setStatusFilter(value)}>
                    <SelectTrigger className="w-full md:w-[200px]">
                      <Filter className="h-4 w-4 mr-2" />
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todas</SelectItem>
                      <SelectItem value="active">Ativas</SelectItem>
                      <SelectItem value="inactive">Inativas</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button
                    variant="outline"
                    onClick={loadAllSDRData}
                    disabled={conversationsLoading}
                  >
                    <RefreshCw className={`h-4 w-4 mr-2 ${conversationsLoading ? 'animate-spin' : ''}`} />
                    Atualizar
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Conversations List */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>
                    Conversas do Agente SDR
                    <span className="text-sm font-normal text-muted-foreground ml-2">
                      ({filteredConversations.length} {filteredConversations.length === 1 ? 'conversa' : 'conversas'})
                    </span>
                  </CardTitle>
                  <Badge variant="outline" className="text-xs">
                    Atualiza automaticamente a cada 30s
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                {conversationsLoading ? (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
                    <p className="text-sm text-muted-foreground">Carregando conversas...</p>
                  </div>
                ) : filteredConversations.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-20" />
                    <p>
                      {searchQuery || statusFilter !== "all"
                        ? "Nenhuma conversa encontrada com os filtros selecionados"
                        : "Nenhuma conversa registrada ainda"}
                    </p>
                    <p className="text-sm mt-2">
                      As conversas aparecerão aqui quando clientes enviarem mensagens
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {filteredConversations.map((conv) => (
                      <Card
                        key={conv.phoneNumber}
                        className={`border-l-4 hover:shadow-md transition-shadow cursor-pointer ${
                          conv.hasActiveConversation
                            ? 'border-l-green-500 bg-green-50/50'
                            : 'border-l-gray-300'
                        }`}
                        onClick={() => handleViewConversation(conv.phoneNumber)}
                      >
                        <CardContent className="pt-4">
                          <div className="flex justify-between items-start">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <p className="font-semibold text-lg">
                                  📱 {formatPhoneNumber(conv.phoneNumber)}
                                </p>
                                {conv.hasActiveConversation && (
                                  <Badge variant="default" className="text-xs">
                                    Ativa
                                  </Badge>
                                )}
                              </div>
                              <div className="space-y-1 text-sm text-muted-foreground">
                                <p>💬 {conv.totalMessages} mensagens no total • {conv.messageCount} na conversa atual</p>
                                {conv.propertyId && (
                                  <p className="text-primary font-medium">
                                    🏠 Interessado no imóvel #{conv.propertyId}
                                  </p>
                                )}
                                <p>📅 Primeiro contato: {new Date(conv.firstContact).toLocaleDateString('pt-BR')}</p>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="text-xs text-muted-foreground mb-2">
                                Última atividade
                              </p>
                              <p className="text-sm font-medium">{formatTimeAgo(conv.lastContact)}</p>
                              {conv.conversationAge !== null && conv.conversationAge !== undefined && (
                                <p className="text-xs text-muted-foreground mt-1">
                                  Conversa de {conv.conversationAge}min atrás
                                </p>
                              )}
                              <Button
                                variant="ghost"
                                size="sm"
                                className="mt-2"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleViewConversation(conv.phoneNumber);
                                }}
                              >
                                <Eye className="h-4 w-4 mr-1" />
                                Ver histórico
                              </Button>
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

      {/* Conversation Viewer Dialog */}
      <ConversationViewer
        phoneNumber={selectedConversation}
        open={conversationViewerOpen}
        onOpenChange={setConversationViewerOpen}
      />
    </div>
  );
};

export default Admin;
