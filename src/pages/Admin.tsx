import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Plus, RefreshCw, Home, MessageSquare, LogOut, Search, Eye, Filter, Star, Users, TrendingUp, Mail, Phone, Upload, UserPlus, Tag, Send } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { Property } from "@/utils/parsePropertyData";
import type { Lead } from "@/types/crm";
import { getApiUrl, getSdrUrl } from "@/utils/api";
import { PropertyForm } from "@/components/PropertyForm";
import { PropertyCreationDialog } from "@/components/PropertyCreationDialog";
import { AIPropertyForm } from "@/components/AIPropertyForm";
import { PropertyTable } from "@/components/PropertyTable";
import { ConversationViewer } from "@/components/ConversationViewer";
import { SDRMetrics } from "@/components/SDRMetrics";
import { FeaturedPropertyManager } from "@/components/FeaturedPropertyManager";
import { ManualLeadForm } from "@/components/ManualLeadForm";
import { LeadImporter } from "@/components/LeadImporter";
import { LeadDetailsDialog } from "@/components/LeadDetailsDialog";
import { WhatsAppBroadcastDialog } from "@/components/WhatsAppBroadcastDialog";
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

  // CRM Leads state
  const [leads, setLeads] = useState<Lead[]>([]);
  const [leadsLoading, setLeadsLoading] = useState(false);
  const [leadSearchQuery, setLeadSearchQuery] = useState("");
  const [leadQualityFilter, setLeadQualityFilter] = useState<"all" | "hot" | "warm" | "cold">("all");
  const [leadTagFilter, setLeadTagFilter] = useState<string>("");
  const [manualLeadFormOpen, setManualLeadFormOpen] = useState(false);
  const [leadImporterOpen, setLeadImporterOpen] = useState(false);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [leadDetailsOpen, setLeadDetailsOpen] = useState(false);
  const [broadcastDialogOpen, setBroadcastDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("properties");

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

  // Load data when tab changes
  useEffect(() => {
    if (activeTab === 'crm') {
      loadLeads();
    } else if (activeTab === 'conversations') {
      loadAllSDRData();
    }
  }, [activeTab]);

  const loadConversations = async () => {
    try {
      setConversationsLoading(true);
      const sdrUrl = getSdrUrl();
      const response = await fetch(`${sdrUrl}/api/conversations`);
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
      const sdrUrl = getSdrUrl();
      const response = await fetch(`${sdrUrl}/api/sdr-stats`);
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

  const loadLeads = async () => {
    try {
      setLeadsLoading(true);
      const apiUrl = getApiUrl();

      console.log('📡 Fetching leads from:', `${apiUrl}/api/baserow/leads`);

      // Buscar leads do Baserow
      const response = await fetch(`${apiUrl}/api/baserow/leads`);
      console.log('📥 Response status:', response.status);

      if (!response.ok) {
        const errorText = await response.text().catch(() => '');
        throw new Error(`API error ${response.status}: ${errorText || 'No response body'}`);
      }

      const data = await response.json();
      console.log('📊 Data received:', { count: data.count, hasResults: !!data.results });

      // Baserow retorna os leads em data.results
      if (data.results) {
        // Mapear dados do Baserow para o formato esperado pelo frontend
        const mappedLeads = data.results.map((item: any) => {
          // Convert Score to number (Baserow returns as string)
          const score = parseInt(item.Score) || 0;

          // Parse indicators safely
          let indicators = [];
          if (item.Indicadores) {
            try {
              indicators = JSON.parse(item.Indicadores);
            } catch (e) {
              console.warn('Failed to parse indicators for lead:', item.Telefone);
            }
          }

          // Parse tags - Tags field is comma-separated string
          let tags: string[] = [];
          if (item.Tags && typeof item.Tags === 'string') {
            tags = item.Tags.split(',').map((tag: string) => tag.trim()).filter((tag: string) => tag !== '');
          }

          return {
            phoneNumber: item.Telefone || '',
            name: item.Nome || null,
            email: item.Email || null,
            score: score,
            quality: item.Qualidade || (score >= 70 ? 'hot' : score >= 40 ? 'warm' : 'cold'),
            indicators: indicators,
            lastEvaluated: item.UltimaAtualizacao || new Date().toISOString(),
            totalMessages: parseInt(item.TotalMensagens) || 0,
            propertyId: item.ImovelInteresse || undefined,
            source: item.Fonte || 'unknown',
            typebotData: {
              tipoTransacao: item.TipoTransacao || null,
              tipoImovel: item.TipoImovel || null,
              budgetCompra: item.BudgetCompra || null,
              budgetLocacao: item.BudgetLocacao || null,
              localizacao: item.Localizacao || null,
              prazo: item.Prazo || null,
              financiamento: item.Financiamento || null,
            },
            observations: item.Observacoes || undefined,
            createdAt: item.DataCadastro || undefined,
            tags: tags,
          };
        });
        console.log('✅ Leads mapped successfully:', mappedLeads.length);
        setLeads(mappedLeads);
      }
    } catch (error) {
      console.error('❌ Error loading leads:', error);
      toast({
        title: "Erro ao carregar leads",
        description: "Não foi possível conectar ao servidor CRM.",
        variant: "destructive",
      });
    } finally {
      setLeadsLoading(false);
    }
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

  const handleViewLeadDetails = (lead: Lead) => {
    setSelectedLead(lead);
    setLeadDetailsOpen(true);
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

  // Get all unique tags from all leads
  const allTags = Array.from(new Set(leads.flatMap((lead) => lead.tags || []))).sort();

  // Filter and sort leads
  const filteredLeads = leads
    .filter((lead) => {
      const matchesSearch =
        lead.phoneNumber.includes(leadSearchQuery) ||
        (lead.name && lead.name.toLowerCase().includes(leadSearchQuery.toLowerCase())) ||
        (lead.email && lead.email.toLowerCase().includes(leadSearchQuery.toLowerCase()));

      const matchesQuality =
        leadQualityFilter === "all" || lead.quality === leadQualityFilter;

      const matchesTag =
        leadTagFilter === "" || (lead.tags && lead.tags.includes(leadTagFilter));

      return matchesSearch && matchesQuality && matchesTag;
    })
    .sort((a, b) => {
      // Sort alphabetically by name
      const nameA = (a.name || 'Nome não informado').toLowerCase();
      const nameB = (b.name || 'Nome não informado').toLowerCase();
      return nameA.localeCompare(nameB, 'pt-BR');
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

  const getQualityBadgeColor = (quality: 'hot' | 'warm' | 'cold') => {
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

  const handleCreateProperty = async (data: Partial<Property>, imageFiles?: File[]) => {
    try {
      console.log('Creating property...');

      // Create property in Baserow first (returns property with real ID)
      const newProperty = await createProperty(data);
      const realId = newProperty.id;

      console.log('Property created with realId:', realId);

      // If we have image files, upload them now using the real ID
      if (imageFiles && imageFiles.length > 0) {
        console.log(`Uploading ${imageFiles.length} images for property ${realId}...`);
        const uploadedUrls: string[] = [];
        const apiUrl = getApiUrl();

        for (let i = 0; i < imageFiles.length; i++) {
          const file = imageFiles[i];
          const fileExtension = file.name.split('.').pop()?.toLowerCase() || 'jpg';
          const fileName = `image_${i + 1}.${fileExtension}`;

          const formData = new FormData();
          formData.append('file', file);
          formData.append('propertyId', realId);
          formData.append('fileName', fileName);

          try {
            const uploadResponse = await fetch(`${apiUrl}/api/upload-image`, {
              method: 'POST',
              body: formData,
            });

            if (uploadResponse.ok) {
              const uploadData = await uploadResponse.json();
              uploadedUrls.push(uploadData.url);
              console.log(`Image ${i + 1} uploaded:`, uploadData.url);
            } else {
              console.error(`Failed to upload image ${i + 1}`);
            }
          } catch (uploadError) {
            console.error(`Error uploading image ${i + 1}:`, uploadError);
          }
        }

        // Update property with image URLs
        if (uploadedUrls.length > 0) {
          await updateProperty(realId, { images: uploadedUrls });
          console.log('Property updated with image URLs');
        }

        toast({
          title: "Imóvel criado com sucesso!",
          description: `ID ${realId}. ${uploadedUrls.length} imagem(ns) adicionada(s).`,
        });
      } else {
        toast({
          title: "Imóvel criado com sucesso!",
          description: `ID ${realId}.`,
        });
      }

      await loadProperties();
    } catch (error) {
      console.error('Error creating property:', error);
      throw error;
    }
  };

  const handleUpdateProperty = async (data: Partial<Property>, imageFiles?: File[]) => {
    if (!editingProperty) return;

    try {
      const propertyId = editingProperty.id;
      let finalImages = data.images || [];

      // If we have new image files, upload them
      if (imageFiles && imageFiles.length > 0) {
        console.log(`Uploading ${imageFiles.length} new images for property ${propertyId}...`);
        const apiUrl = getApiUrl();

        for (let i = 0; i < imageFiles.length; i++) {
          const file = imageFiles[i];
          const fileExtension = file.name.split('.').pop()?.toLowerCase() || 'jpg';
          const fileName = `image_${finalImages.length + i + 1}.${fileExtension}`;

          const formData = new FormData();
          formData.append('file', file);
          formData.append('propertyId', propertyId);
          formData.append('fileName', fileName);

          try {
            const uploadResponse = await fetch(`${apiUrl}/api/upload-image`, {
              method: 'POST',
              body: formData,
            });

            if (uploadResponse.ok) {
              const uploadData = await uploadResponse.json();
              finalImages.push(uploadData.url);
              console.log(`Image ${i + 1} uploaded:`, uploadData.url);
            } else {
              console.error(`Failed to upload image ${i + 1}`);
            }
          } catch (uploadError) {
            console.error(`Error uploading image ${i + 1}:`, uploadError);
          }
        }
      }

      // Update property with all data including images
      await updateProperty(propertyId, { ...data, images: finalImages });

      toast({
        title: "Imóvel atualizado!",
        description: imageFiles && imageFiles.length > 0
          ? `${imageFiles.length} nova(s) imagem(ns) adicionada(s).`
          : "As alterações foram salvas com sucesso.",
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
        <Tabs defaultValue="properties" value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="mb-6">
            <TabsTrigger value="properties">Imóveis</TabsTrigger>
            <TabsTrigger value="featured">
              <Star className="h-4 w-4 mr-2" />
              Imóvel em Destaque
            </TabsTrigger>
            <TabsTrigger value="conversations">
              <MessageSquare className="h-4 w-4 mr-2" />
              Conversas SDR
            </TabsTrigger>
            <TabsTrigger value="crm">
              <Users className="h-4 w-4 mr-2" />
              CRM - Leads
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

          {/* Featured Property Tab */}
          <TabsContent value="featured">
            <FeaturedPropertyManager />
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

          {/* CRM Tab */}
          <TabsContent value="crm">
            {/* CRM Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    Total de Leads
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{leads.length}</div>
                </CardContent>
              </Card>

              <Card className="border-red-200 bg-red-600">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-white flex items-center gap-2">
                    <TrendingUp className="h-4 w-4" />
                    Leads Quentes
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-white">
                    {leads.filter(l => l.quality === 'hot').length}
                  </div>
                </CardContent>
              </Card>

              <Card className="border-yellow-200 bg-yellow-600">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-white flex items-center gap-2">
                    <TrendingUp className="h-4 w-4" />
                    Leads Mornos
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-white">
                    {leads.filter(l => l.quality === 'warm').length}
                  </div>
                </CardContent>
              </Card>

              <Card className="border-blue-200 bg-blue-600">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-white flex items-center gap-2">
                    <TrendingUp className="h-4 w-4" />
                    Leads Frios
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-white">
                    {leads.filter(l => l.quality === 'cold').length}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Filters and Actions */}
            <Card className="mb-4">
              <CardContent className="pt-6">
                <div className="flex flex-col gap-4">
                  <div className="flex flex-col md:flex-row gap-4">
                    <div className="flex-1 relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Buscar por nome, email ou telefone..."
                        value={leadSearchQuery}
                        onChange={(e) => setLeadSearchQuery(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                    <Select value={leadQualityFilter} onValueChange={(value: any) => setLeadQualityFilter(value)}>
                      <SelectTrigger className="w-full md:w-[200px]">
                        <Filter className="h-4 w-4 mr-2" />
                        <SelectValue placeholder="Qualidade" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todos</SelectItem>
                        <SelectItem value="hot">Quentes</SelectItem>
                        <SelectItem value="warm">Mornos</SelectItem>
                        <SelectItem value="cold">Frios</SelectItem>
                      </SelectContent>
                    </Select>
                    <Select
                      value={leadTagFilter === "" ? "all" : leadTagFilter}
                      onValueChange={(value) => {
                        const newValue = value === "all" ? "" : value;
                        setLeadTagFilter(newValue);
                      }}
                    >
                      <SelectTrigger className="w-full md:w-[200px]">
                        <Tag className="h-4 w-4 mr-2" />
                        <SelectValue placeholder="Filtrar por tag" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todas as tags</SelectItem>
                        {allTags.map((tag) => (
                          <SelectItem key={tag} value={tag}>
                            {tag}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button
                      variant="outline"
                      onClick={loadLeads}
                      disabled={leadsLoading}
                    >
                      <RefreshCw className={`h-4 w-4 mr-2 ${leadsLoading ? 'animate-spin' : ''}`} />
                      Atualizar
                    </Button>
                  </div>

                  {/* Action buttons */}
                  <div className="flex flex-col md:flex-row gap-2">
                    <Button
                      onClick={() => setManualLeadFormOpen(true)}
                      className="flex-1"
                    >
                      <UserPlus className="h-4 w-4 mr-2" />
                      Adicionar Lead
                    </Button>
                    <Button
                      onClick={() => setLeadImporterOpen(true)}
                      variant="outline"
                      className="flex-1"
                    >
                      <Upload className="h-4 w-4 mr-2" />
                      Importar CSV
                    </Button>
                    <Button
                      variant="secondary"
                      className="flex-1"
                      onClick={() => setBroadcastDialogOpen(true)}
                    >
                      <Send className="h-4 w-4 mr-2" />
                      Enviar WhatsApp em Massa
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Leads List */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>
                    Leads do CRM
                    <span className="text-sm font-normal text-muted-foreground ml-2">
                      ({filteredLeads.length} {filteredLeads.length === 1 ? 'lead' : 'leads'})
                    </span>
                  </CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                {leadsLoading ? (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
                    <p className="text-sm text-muted-foreground">Carregando leads...</p>
                  </div>
                ) : filteredLeads.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <Users className="h-12 w-12 mx-auto mb-4 opacity-20" />
                    <p>
                      {leadSearchQuery || leadQualityFilter !== "all"
                        ? "Nenhum lead encontrado com os filtros selecionados"
                        : "Nenhum lead cadastrado ainda"}
                    </p>
                    <p className="text-sm mt-2">
                      Os leads aparecerão aqui quando o agente avaliar os clientes
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {filteredLeads.map((lead) => (
                      <Card
                        key={lead.phoneNumber}
                        className={`border-l-4 hover:shadow-md transition-shadow ${
                          lead.quality === 'hot' ? 'border-l-red-500 bg-red-50/30' :
                          lead.quality === 'warm' ? 'border-l-yellow-500 bg-yellow-50/40' :
                          'border-l-blue-500 bg-blue-50/30'
                        }`}
                      >
                        <CardContent className="pt-4">
                          <div className="flex justify-between items-start mb-4">
                            <div className="flex-1">
                              <div className="flex items-center gap-3 mb-2">
                                <h3 className="text-lg font-semibold">
                                  {lead.name || 'Nome não informado'}
                                </h3>
                                <Badge className={getQualityBadgeColor(lead.quality)}>
                                  {getQualityLabel(lead.quality)} - {lead.score} pts
                                </Badge>
                              </div>

                              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                                <div className="flex items-center gap-2 text-muted-foreground">
                                  <Phone className="h-4 w-4" />
                                  <span>{formatPhoneNumber(lead.phoneNumber)}</span>
                                </div>
                                {lead.email && (
                                  <div className="flex items-center gap-2 text-muted-foreground">
                                    <Mail className="h-4 w-4" />
                                    <span>{lead.email}</span>
                                  </div>
                                )}
                              </div>

                              <div className="mt-3 text-sm text-muted-foreground">
                                <p>💬 {lead.totalMessages} mensagens</p>
                                {lead.propertyId && (
                                  <p className="text-primary font-medium">
                                    🏠 Interessado no imóvel #{lead.propertyId}
                                  </p>
                                )}
                              </div>

                              {/* Typebot Data */}
                              {lead.typebotData && (
                                <div className="mt-4 p-3 bg-blue-50 rounded-md border border-blue-200">
                                  <p className="text-xs font-semibold text-blue-900 mb-2">Dados do Formulário:</p>
                                  <div className="grid grid-cols-2 gap-2 text-xs text-gray-800">
                                    {lead.typebotData.tipoTransacao && (
                                      <div>
                                        <span className="font-medium text-blue-800">Transação:</span> {lead.typebotData.tipoTransacao}
                                      </div>
                                    )}
                                    {lead.typebotData.tipoImovel && (
                                      <div>
                                        <span className="font-medium text-blue-800">Tipo:</span> {lead.typebotData.tipoImovel}
                                      </div>
                                    )}
                                    {lead.typebotData.budgetCompra && (
                                      <div>
                                        <span className="font-medium text-blue-800">Budget Compra:</span> {lead.typebotData.budgetCompra}
                                      </div>
                                    )}
                                    {lead.typebotData.budgetLocacao && (
                                      <div>
                                        <span className="font-medium text-blue-800">Budget Locação:</span> {lead.typebotData.budgetLocacao}
                                      </div>
                                    )}
                                    {lead.typebotData.localizacao && (
                                      <div>
                                        <span className="font-medium text-blue-800">Localização:</span> {lead.typebotData.localizacao}
                                      </div>
                                    )}
                                    {lead.typebotData.prazo && (
                                      <div>
                                        <span className="font-medium text-blue-800">Prazo:</span> {lead.typebotData.prazo}
                                      </div>
                                    )}
                                    {lead.typebotData.financiamento && (
                                      <div>
                                        <span className="font-medium text-blue-800">Financiamento:</span> {lead.typebotData.financiamento}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              )}

                              {/* Quality Indicators */}
                              {lead.indicators && lead.indicators.length > 0 && (
                                <div className="mt-3">
                                  <p className="text-xs font-semibold text-gray-600 mb-1">Indicadores de Qualidade:</p>
                                  <div className="flex flex-wrap gap-1">
                                    {lead.indicators.map((indicator, idx) => (
                                      <Badge key={idx} variant="secondary" className="text-xs">
                                        {indicator}
                                      </Badge>
                                    ))}
                                  </div>
                                </div>
                              )}

                              {/* Tags */}
                              {lead.tags && lead.tags.length > 0 && (
                                <div className="mt-3">
                                  <p className="text-xs font-semibold text-gray-600 mb-1 flex items-center gap-1">
                                    <Tag className="h-3 w-3" />
                                    Tags:
                                  </p>
                                  <div className="flex flex-wrap gap-1">
                                    {lead.tags.map((tag, idx) => (
                                      <Badge key={idx} variant="outline" className="text-xs bg-purple-50 border-purple-300 text-purple-800">
                                        {tag}
                                      </Badge>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>

                            <div className="text-right flex flex-col items-end gap-2">
                              <div>
                                <p className="text-xs text-muted-foreground mb-1">Última avaliação</p>
                                <p className="text-sm font-medium">
                                  {formatTimeAgo(lead.lastEvaluated)}
                                </p>
                              </div>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleViewLeadDetails(lead)}
                              >
                                <Eye className="h-4 w-4 mr-1" />
                                Ver Detalhes
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

      {/* Manual Lead Form Dialog */}
      <ManualLeadForm
        open={manualLeadFormOpen}
        onOpenChange={setManualLeadFormOpen}
        onSuccess={loadLeads}
      />

      {/* Lead Importer Dialog */}
      <LeadImporter
        open={leadImporterOpen}
        onOpenChange={setLeadImporterOpen}
        onSuccess={loadLeads}
      />

      {/* Lead Details Dialog */}
      <LeadDetailsDialog
        lead={selectedLead}
        open={leadDetailsOpen}
        onOpenChange={setLeadDetailsOpen}
      />

      {/* WhatsApp Broadcast Dialog */}
      <WhatsAppBroadcastDialog
        open={broadcastDialogOpen}
        onOpenChange={setBroadcastDialogOpen}
        leads={leads}
        onSuccess={loadLeads}
      />
    </div>
  );
};

export default Admin;
