import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Sparkles, Edit3 } from "lucide-react";

interface PropertyCreationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectManual: () => void;
  onSelectAI: () => void;
}

export function PropertyCreationDialog({
  open,
  onOpenChange,
  onSelectManual,
  onSelectAI,
}: PropertyCreationDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Como deseja criar o imóvel?</DialogTitle>
          <DialogDescription>
            Escolha entre criar manualmente ou usar IA para preencher automaticamente os dados
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-6">
          {/* Manual Creation */}
          <button
            onClick={onSelectManual}
            className="group relative overflow-hidden rounded-lg border-2 border-muted hover:border-primary transition-all p-6 text-left"
          >
            <div className="flex flex-col items-center text-center space-y-4">
              <div className="p-4 rounded-full bg-muted group-hover:bg-primary/10 transition-colors">
                <Edit3 className="h-8 w-8 text-muted-foreground group-hover:text-primary transition-colors" />
              </div>
              <div>
                <h3 className="font-semibold text-lg mb-2">Criação Manual</h3>
                <p className="text-sm text-muted-foreground">
                  Preencha todos os campos do imóvel manualmente, um por um
                </p>
              </div>
            </div>
          </button>

          {/* AI Creation */}
          <button
            onClick={onSelectAI}
            className="group relative overflow-hidden rounded-lg border-2 border-muted hover:border-primary transition-all p-6 text-left bg-gradient-to-br from-primary/5 to-purple-500/5"
          >
            <div className="flex flex-col items-center text-center space-y-4">
              <div className="p-4 rounded-full bg-primary/10 group-hover:bg-primary/20 transition-colors">
                <Sparkles className="h-8 w-8 text-primary animate-pulse" />
              </div>
              <div>
                <h3 className="font-semibold text-lg mb-2 flex items-center justify-center gap-2">
                  Criação com IA
                  <span className="text-xs bg-primary text-primary-foreground px-2 py-1 rounded">
                    NOVO
                  </span>
                </h3>
                <p className="text-sm text-muted-foreground">
                  Envie imagens e uma breve descrição. A IA gera automaticamente título, descrição completa e detalhes
                </p>
              </div>
            </div>
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
