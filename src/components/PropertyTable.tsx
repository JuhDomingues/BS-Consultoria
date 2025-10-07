import { useState } from "react";
import { Property } from "@/utils/parsePropertyData";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Edit, MoreVertical, Trash2, Eye, EyeOff, ExternalLink } from "lucide-react";

interface PropertyTableProps {
  properties: Property[];
  onEdit: (property: Property) => void;
  onDelete: (id: string) => void;
  onToggleActive: (id: string, active: boolean) => void;
}

export function PropertyTable({
  properties,
  onEdit,
  onDelete,
  onToggleActive,
}: PropertyTableProps) {
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleDelete = (id: string) => {
    if (window.confirm("Tem certeza que deseja excluir este imóvel?")) {
      setDeletingId(id);
      onDelete(id);
    }
  };

  const getStatusBadge = (property: Property) => {
    const active = property.active !== false;

    if (!active) {
      return <Badge variant="secondary">Inativo</Badge>;
    }
    return <Badge className="bg-green-600">Ativo</Badge>;
  };

  return (
    <div className="border rounded-lg">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>ID</TableHead>
            <TableHead>Título</TableHead>
            <TableHead>Preço</TableHead>
            <TableHead>Tipo</TableHead>
            <TableHead>Categoria</TableHead>
            <TableHead>Cidade</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {properties.length === 0 ? (
            <TableRow>
              <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                Nenhum imóvel cadastrado
              </TableCell>
            </TableRow>
          ) : (
            properties.map((property) => (
              <TableRow key={property.id}>
                <TableCell className="font-mono text-sm">{property.id}</TableCell>
                <TableCell className="max-w-xs truncate">{property.title}</TableCell>
                <TableCell>{property.price}</TableCell>
                <TableCell>
                  <Badge variant="outline">{property.type}</Badge>
                </TableCell>
                <TableCell>
                  <Badge variant={property.category === "Venda" ? "default" : "secondary"}>
                    {property.category}
                  </Badge>
                </TableCell>
                <TableCell>{property.city}</TableCell>
                <TableCell>{getStatusBadge(property)}</TableCell>
                <TableCell className="text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuLabel>Ações</DropdownMenuLabel>
                      <DropdownMenuSeparator />

                      <DropdownMenuItem
                        onClick={() => window.open(`/imovel/${property.id}`, "_blank")}
                      >
                        <ExternalLink className="h-4 w-4 mr-2" />
                        Ver no Site
                      </DropdownMenuItem>

                      <DropdownMenuItem onClick={() => onEdit(property)}>
                        <Edit className="h-4 w-4 mr-2" />
                        Editar
                      </DropdownMenuItem>

                      <DropdownMenuItem
                        onClick={() => {
                          const currentActive = property.active !== false;
                          onToggleActive(property.id, !currentActive);
                        }}
                      >
                        {property.active !== false ? (
                          <>
                            <EyeOff className="h-4 w-4 mr-2" />
                            Desativar
                          </>
                        ) : (
                          <>
                            <Eye className="h-4 w-4 mr-2" />
                            Ativar
                          </>
                        )}
                      </DropdownMenuItem>

                      <DropdownMenuSeparator />

                      <DropdownMenuItem
                        onClick={() => handleDelete(property.id)}
                        disabled={deletingId === property.id}
                        className="text-red-600"
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        {deletingId === property.id ? "Excluindo..." : "Excluir"}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}
