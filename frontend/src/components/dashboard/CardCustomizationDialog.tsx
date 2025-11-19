import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
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
import { DashboardCardConfig } from "./DashboardCard";
import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { CheckSquare, FileText, Layers, TrendingUp, Users, BarChart3, ListTodo } from "lucide-react";

interface CardCustomizationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  card?: DashboardCardConfig | null;
  onSave: (card: DashboardCardConfig) => void;
}

const iconOptions = [
  { value: 'tasks', label: 'Tasks', icon: CheckSquare, color: 'text-primary' },
  { value: 'documents', label: 'Documents', icon: FileText, color: 'text-secondary' },
  { value: 'boards', label: 'Boards', icon: Layers, color: 'text-accent' },
  { value: 'team', label: 'Team', icon: Users, color: 'text-success' },
  { value: 'chart', label: 'Chart', icon: BarChart3, color: 'text-primary' },
  { value: 'trending', label: 'Trending', icon: TrendingUp, color: 'text-primary' },
  { value: 'list', label: 'List', icon: ListTodo, color: 'text-muted-foreground' },
];

const colorOptions = [
  { value: 'border-l-primary', label: 'Primary' },
  { value: 'border-l-secondary', label: 'Secondary' },
  { value: 'border-l-accent', label: 'Accent' },
  { value: 'border-l-success', label: 'Success' },
  { value: 'border-l-destructive', label: 'Destructive' },
  { value: 'border-l-warning', label: 'Warning' },
];

export function CardCustomizationDialog({
  open,
  onOpenChange,
  card,
  onSave,
}: CardCustomizationDialogProps) {
  const { t } = useTranslation();
  const [formData, setFormData] = useState<Partial<DashboardCardConfig>>({
    title: '',
    description: '',
    type: 'custom',
    size: 'medium',
    color: 'border-l-primary',
    visible: true,
  });

  useEffect(() => {
    if (card) {
      setFormData(card);
    } else {
      setFormData({
        title: '',
        description: '',
        type: 'custom',
        size: 'medium',
        color: 'border-l-primary',
        visible: true,
      });
    }
  }, [card, open]);

  const handleSave = () => {
    if (!formData.title) return;

    const cardData: DashboardCardConfig = {
      id: card?.id || `custom-${Date.now()}`,
      title: formData.title,
      description: formData.description,
      type: formData.type as any,
      size: formData.size as any,
      color: formData.color,
      visible: formData.visible ?? true,
      order: card?.order ?? 999,
    };

    onSave(cardData);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>
            {card ? t('dashboard.editCard', 'Edit Card') : t('dashboard.addCard', 'Add New Card')}
          </DialogTitle>
          <DialogDescription>
            {t('dashboard.cardDescription', 'Customize your dashboard card settings')}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="title">{t('form.title', 'Title')}</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder={t('dashboard.cardTitlePlaceholder', 'Enter card title...')}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">{t('form.description', 'Description')}</Label>
            <Input
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder={t('dashboard.cardDescPlaceholder', 'Enter card description...')}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="type">{t('dashboard.cardType', 'Type')}</Label>
              <Select
                value={formData.type}
                onValueChange={(value) => setFormData({ ...formData, type: value as any })}
              >
                <SelectTrigger id="type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="stat">{t('dashboard.typeStat', 'Statistic')}</SelectItem>
                  <SelectItem value="chart">{t('dashboard.typeChart', 'Chart')}</SelectItem>
                  <SelectItem value="list">{t('dashboard.typeList', 'List')}</SelectItem>
                  <SelectItem value="quick-action">{t('dashboard.typeAction', 'Quick Action')}</SelectItem>
                  <SelectItem value="custom">{t('dashboard.typeCustom', 'Custom')}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="size">{t('dashboard.cardSize', 'Size')}</Label>
              <Select
                value={formData.size}
                onValueChange={(value) => setFormData({ ...formData, size: value as any })}
              >
                <SelectTrigger id="size">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="small">{t('dashboard.sizeSmall', 'Small')}</SelectItem>
                  <SelectItem value="medium">{t('dashboard.sizeMedium', 'Medium')}</SelectItem>
                  <SelectItem value="large">{t('dashboard.sizeLarge', 'Large')}</SelectItem>
                  <SelectItem value="full">{t('dashboard.sizeFull', 'Full Width')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="color">{t('dashboard.cardColor', 'Accent Color')}</Label>
            <Select
              value={formData.color}
              onValueChange={(value) => setFormData({ ...formData, color: value })}
            >
              <SelectTrigger id="color">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {colorOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    <div className="flex items-center gap-2">
                      <div className={`w-3 h-3 rounded-full ${option.value.replace('border-l-', 'bg-')}`} />
                      {option.label}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t('common.cancel', 'Cancel')}
          </Button>
          <Button onClick={handleSave} disabled={!formData.title}>
            {t('common.save', 'Save')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

