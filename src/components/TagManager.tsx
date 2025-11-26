import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { X, Plus } from "lucide-react";

interface TagManagerProps {
  tags: string[];
  onChange: (tags: string[]) => void;
  readOnly?: boolean;
}

export function TagManager({ tags, onChange, readOnly = false }: TagManagerProps) {
  const [newTag, setNewTag] = useState("");

  const addTag = () => {
    const trimmedTag = newTag.trim();
    if (trimmedTag && !tags.includes(trimmedTag)) {
      onChange([...tags, trimmedTag]);
      setNewTag("");
    }
  };

  const removeTag = (tagToRemove: string) => {
    onChange(tags.filter((tag) => tag !== tagToRemove));
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      addTag();
    }
  };

  // Predefined tag suggestions
  const tagSuggestions = [
    "Typebot",
    "Site",
    "WhatsApp",
    "Prioridade",
    "Urgente",
    "Interessado",
    "Agendar",
    "Retornar",
    "Qualificado",
    "Aguardando",
    "Documentos",
    "Financiamento",
    "Investidor",
  ];

  const normalizedInput = newTag.trim().toLowerCase();
  const filteredSuggestions = tagSuggestions.filter((suggestion) => {
    if (tags.includes(suggestion)) {
      return false;
    }
    if (!normalizedInput) {
      return true;
    }
    return suggestion.toLowerCase().includes(normalizedInput);
  });

  return (
    <div className="space-y-3">
      {/* Display tags */}
      {tags.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {tags.map((tag) => (
            <Badge
              key={tag}
              variant="secondary"
              className="px-3 py-1 text-sm"
            >
              {tag}
              {!readOnly && (
                <button
                  onClick={() => removeTag(tag)}
                  className="ml-2 hover:text-destructive transition-colors"
                  type="button"
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </Badge>
          ))}
        </div>
      )}

      {/* Add new tag */}
      {!readOnly && (
        <div>
          <div className="flex gap-2">
            <Input
              value={newTag}
              onChange={(e) => setNewTag(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Adicionar tag..."
              className="flex-1"
            />
            <Button
              type="button"
              onClick={addTag}
              size="sm"
              variant="outline"
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>

          {/* Tag suggestions */}
          <div className="mt-2">
            <p className="text-xs text-muted-foreground mb-1">Sugestões:</p>
            {filteredSuggestions.length > 0 ? (
              <div className="flex flex-wrap gap-1">
                {filteredSuggestions.map((suggestion) => (
                  <button
                    key={suggestion}
                    type="button"
                    onClick={() => {
                      onChange([...tags, suggestion]);
                      setNewTag("");
                    }}
                    className="text-xs px-2 py-1 rounded-md bg-muted hover:bg-muted/80 transition-colors"
                  >
                    + {suggestion}
                  </button>
                ))}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">Nenhuma sugestão disponível.</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
