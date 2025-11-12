import { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { format } from 'date-fns';
import { parseNaturalLanguage, ParsedTask } from '@/lib/parseNatural';
import { generateAI } from '@/lib/aiClient';
import { useTaskStore } from '@/store/taskStore';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar, Flag, Tag, Zap, Loader2, Sparkles, Edit3, Save, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface SmartTaskParserProps {
  onCreateTask: (parsedTask: ParsedTask) => void;
  onCancel?: () => void;
  placeholder?: string;
  className?: string;
}

export function SmartTaskParser({ 
  onCreateTask, 
  onCancel, 
  placeholder, 
  className 
}: SmartTaskParserProps) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const { getAllTags } = useTaskStore();
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [parsedTask, setParsedTask] = useState<ParsedTask | null>(null);
  const [parseMethod, setParseMethod] = useState<'server' | 'local' | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editedTask, setEditedTask] = useState<ParsedTask | null>(null);
  const [newSubtaskTitle, setNewSubtaskTitle] = useState('');

  // Load API key on mount
  useState(() => {
    // API key is now configured server-side, no user input needed
  });

  const parseInput = useCallback(async (inputText: string) => {
    if (!inputText.trim()) {
      setParsedTask(null);
      setParseMethod(null);
      return;
    }

    setIsLoading(true);
    
    try {
      // First try server AI (same source as Board AI)
      const serverResult = await generateAI<{ task: any }>({ type: 'task', prompt: inputText });
      if (serverResult?.task) {
        const t = serverResult.task;
        const normalized: ParsedTask = {
          title: t.title,
          description: t.description,
          // Convert ISO local 'yyyy-MM-ddTHH:mm' to Date
          dueAt: t.dueAt ? new Date(t.dueAt) : new Date(),
          priority: t.priority,
          tags: Array.isArray(t.tags) ? t.tags : [],
          subtasks: Array.isArray(t.subtasks) ? t.subtasks : [],
        };
        setParsedTask(normalized);
        setEditedTask(normalized);
        setParseMethod('server');
        setIsEditing(false);
        setIsLoading(false);
        return;
      }
    } catch (error: any) {
      console.warn('Server AI parsing failed, falling back to local parser:', error);
      
      toast({
        title: "AI Parser Unavailable", 
        description: "Using local natural language parser instead.",
        variant: "default",
      });
    }

    // Fallback to local parser
    try {
      const localResult = parseNaturalLanguage(inputText);
      setParsedTask(localResult);
      setEditedTask(localResult);
      setParseMethod('local');
      setIsEditing(false);
    } catch (error) {
      console.error('Local parsing failed:', error);
      setParsedTask(null);
      setParseMethod(null);
      toast({
        title: "Parsing Failed",
        description: "Could not parse the task. Please try rephrasing.",
        variant: "destructive",
      });
    }
    
    setIsLoading(false);
  }, [toast]);

  // Manual parsing when user clicks preview button
  const handlePreview = () => {
    if (input.trim()) {
      parseInput(input);
    }
  };

  const handleCreateTask = () => {
    const taskToCreate = editedTask || parsedTask;
    if (taskToCreate) {
      onCreateTask(taskToCreate);
      setInput(''); // Clear input after creation
      setParsedTask(null);
      setEditedTask(null);
      setParseMethod(null);
      setIsEditing(false);
    }
  };

  const handleEditToggle = () => {
    if (!isEditing && parsedTask) {
      setEditedTask({ ...parsedTask });
    }
    setIsEditing(!isEditing);
  };

  const handleEditChange = (field: keyof ParsedTask, value: any) => {
    if (editedTask) {
      setEditedTask({
        ...editedTask,
        [field]: value
      });
    }
  };

  const handleAddTag = (tagToAdd: string) => {
    if (editedTask && !editedTask.tags.includes(tagToAdd)) {
      setEditedTask({
        ...editedTask,
        tags: [...editedTask.tags, tagToAdd]
      });
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    if (editedTask) {
      setEditedTask({
        ...editedTask,
        tags: editedTask.tags.filter(tag => tag !== tagToRemove)
      });
    }
  };

  const handleAddSubtask = () => {
    const title = newSubtaskTitle.trim();
    if (!editedTask || !title) return;
    const next = Array.isArray(editedTask.subtasks) ? editedTask.subtasks : [];
    setEditedTask({
      ...editedTask,
      subtasks: [...next, title],
    });
    setNewSubtaskTitle('');
  };

  const handleRemoveSubtask = (index: number) => {
    if (!editedTask || !Array.isArray(editedTask.subtasks)) return;
    setEditedTask({
      ...editedTask,
      subtasks: editedTask.subtasks.filter((_, i) => i !== index),
    });
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "High": return "bg-destructive text-destructive-foreground border-destructive";
      case "Medium": return "bg-muted text-foreground border-border";
      case "Low": return "bg-primary text-primary-foreground border-primary";
      default: return "bg-secondary text-secondary-foreground border-border";
    }
  };

  const examples = [
    "Finish essay next Monday high #english",
    "Buy groceries tomorrow #shopping",
    "Team meeting Friday important #work",
    "Doctor appointment Tuesday #health"
  ];

  return (
    <div className={cn("space-y-4", className)}>
      {/* Header with AI Status Indicator */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1">
            {parseMethod === 'server' && (
              <div title="Powered by DevFlow AI">
                <Sparkles className="h-4 w-4 text-primary" />
              </div>
            )}
            {parseMethod === 'local' && (
              <div title="Local parser">
                <Zap className="h-4 w-4 text-foreground" />
              </div>
            )}
          </div>
          <span className="text-sm text-muted-foreground">
            {parseMethod === 'server' && 'AI Enhanced'}
            {parseMethod === 'local' && 'Local Parser'}
            {isLoading && 'Parsing...'}
          </span>
        </div>
        
        <div className="flex items-center gap-2">
          <Badge variant={parseMethod === 'server' ? 'outline' : 'secondary'} className="text-xs">
            {parseMethod === 'server' ? 'AI Ready' : 'Local Only'}
          </Badge>
        </div>
      </div>

      {/* Main Content - Side by Side Layout */}
      <div className="flex flex-col lg:flex-row gap-6">
        {/* Left Column - Input Area */}
        <div className="lg:w-2/5 space-y-4">
          {/* Input Area */}
          <div className="space-y-2">
            <Textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={placeholder || t('smartParser.placeholder', 'Type your task naturally: "Finish project next Friday 3pm high #work"')}
              className="min-h-[80px] max-h-[120px] resize-none"
              rows={3}
              disabled={isLoading}
            />
            
            {/* Examples */}
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">
                {t('smartParser.examples', 'Examples:')}
              </p>
              <div className="grid grid-cols-1 gap-1">
                {examples.map((example, index) => (
                  <button
                    key={index}
                    onClick={() => setInput(example)}
                    className="text-left text-xs text-muted-foreground hover:text-primary transition-colors p-1 rounded hover:bg-primary/10"
                  >
                    "{example}"
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Existing Tags */}
          {getAllTags().length > 0 && (
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground">
                Available tags:
              </p>
              <div className="flex flex-wrap gap-1">
                {getAllTags().slice(0, 8).map((tag) => (
                  <Badge
                    key={tag}
                    variant="outline"
                    className="text-xs cursor-pointer hover:bg-primary hover:text-primary-foreground"
                    onClick={() => {
                      const currentInput = input.trim();
                      const newInput = currentInput ? `${currentInput} #${tag}` : `#${tag}`;
                      setInput(newInput);
                    }}
                  >
                    #{tag}
                  </Badge>
                ))}
                {getAllTags().length > 8 && (
                  <span className="text-xs text-muted-foreground">
                    +{getAllTags().length - 8} more
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Preview Button */}
          <div className="flex gap-2">
            <Button
              onClick={handlePreview}
              disabled={!input.trim() || isLoading}
              variant="outline"
              className="flex-1"
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {t('smartParser.parsing', 'Parsing...')}
                </>
              ) : (
                <>
                  <Sparkles className="mr-2 h-4 w-4" />
                  {t('smartParser.preview', 'Preview')}
                </>
              )}
            </Button>
            {parsedTask && (
              <Button onClick={handleCreateTask} className="flex-1">
                {t('smartParser.createTask', 'Create Task')}
              </Button>
            )}
          </div>
        </div>

        {/* Right Column - Preview */}
        <div className="lg:w-3/5">
          {/* Preview Results */}
          {parsedTask ? (
            <Card className="border-dashed min-h-[300px]">
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base font-medium">
                    {t('smartParser.preview', 'Preview')}
                  </CardTitle>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleEditToggle}
                    className="h-8 px-2"
                  >
                    {isEditing ? (
                      <X className="h-4 w-4 mr-1" />
                    ) : (
                      <Edit3 className="h-4 w-4 mr-1" />
                    )}
                    {isEditing ? 'Cancel' : 'Edit'}
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {isEditing && editedTask ? (
                  // Edit Mode
                  <>
                    {/* Title Edit */}
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-muted-foreground">
                        {t('form.title', 'Title')}:
                      </label>
                      <Input
                        value={editedTask.title}
                        onChange={(e) => handleEditChange('title', e.target.value)}
                        className="font-semibold"
                      />
                    </div>

                    {/* Description Edit */}
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-muted-foreground">
                        {t('form.description', 'Description')}:
                      </label>
                      <Textarea
                        value={editedTask.description || ''}
                        onChange={(e) => handleEditChange('description', e.target.value)}
                        className="min-h-[80px] resize-none"
                        placeholder="Add a description..."
                      />
                    </div>

                    {/* Due Date Edit */}
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-muted-foreground">
                        Due Date:
                      </label>
                      <Input
                        type="date"
                        value={format(editedTask.dueAt, 'yyyy-MM-dd')}
                        onChange={(e) => {
                          const newDate = new Date(e.target.value);
                          if (!isNaN(newDate.getTime())) {
                            handleEditChange('dueAt', newDate);
                          }
                        }}
                      />
                    </div>

                    {/* Priority Edit */}
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-muted-foreground">
                        Priority:
                      </label>
                      <Select
                        value={editedTask.priority}
                        onValueChange={(value) => handleEditChange('priority', value)}
                      >
                        <SelectTrigger className="w-32">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Low">Low</SelectItem>
                          <SelectItem value="Medium">Medium</SelectItem>
                          <SelectItem value="High">High</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Tags Edit */}
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-muted-foreground">
                        Tags:
                      </label>
                      <div className="flex flex-wrap gap-2">
                        {editedTask.tags.map((tag, index) => (
                          <Badge
                            key={index}
                            variant="secondary"
                            className="text-xs cursor-pointer hover:bg-destructive hover:text-destructive-foreground"
                            onClick={() => handleRemoveTag(tag)}
                          >
                            #{tag} <X className="h-3 w-3 ml-1" />
                          </Badge>
                        ))}
                        {getAllTags().filter(tag => !editedTask.tags.includes(tag)).slice(0, 5).map((tag) => (
                          <Badge
                            key={tag}
                            variant="outline"
                            className="text-xs cursor-pointer hover:bg-primary hover:text-primary-foreground"
                            onClick={() => handleAddTag(tag)}
                          >
                            +#{tag}
                          </Badge>
                        ))}
                      </div>
                    </div>

                    {/* Subtasks Edit */}
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-muted-foreground">
                        Subtasks:
                      </label>
                      <div className="space-y-2">
                        {(editedTask.subtasks ?? []).length === 0 ? (
                          <p className="text-xs text-muted-foreground">Chưa có subtask. Bạn có thể thêm ở dưới.</p>
                        ) : (
                          <ul className="space-y-1">
                            {(editedTask.subtasks ?? []).map((st, i) => (
                              <li key={i} className="flex items-center justify-between gap-2 rounded-md border px-2 py-1">
                                <span className="text-sm">{st}</span>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7"
                                  onClick={() => handleRemoveSubtask(i)}
                                  title="Remove subtask"
                                >
                                  <X className="h-4 w-4" />
                                </Button>
                              </li>
                            ))}
                          </ul>
                        )}
                        <div className="flex items-center gap-2">
                          <Input
                            placeholder="Thêm subtask..."
                            value={newSubtaskTitle}
                            onChange={(e) => setNewSubtaskTitle(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                handleAddSubtask();
                              }
                            }}
                          />
                          <Button variant="outline" onClick={handleAddSubtask}>
                            Thêm
                          </Button>
                        </div>
                      </div>
                    </div>

                    {/* Save Changes Button */}
                    <div className="pt-2 border-t">
                      <Button
                        onClick={() => setIsEditing(false)}
                        className="w-full"
                        size="sm"
                      >
                        <Save className="h-4 w-4 mr-2" />
                        Save Changes
                      </Button>
                    </div>
                  </>
                ) : (
                  // View Mode
                  <>
                    {/* Title */}
                    <div className="flex items-start gap-3">
                      <span className="text-base font-medium text-muted-foreground min-w-[60px]">
                        {t('form.title', 'Title')}:
                      </span>
                      <span className="text-base font-semibold">
                        {(editedTask || parsedTask).title}
                      </span>
                    </div>

                    {/* Description */}
                    {(editedTask || parsedTask).description && (
                      <div className="space-y-2">
                        <span className="text-base font-medium text-muted-foreground">
                          {t('form.description', 'Description')}:
                        </span>
                        <p className="text-sm text-muted-foreground bg-muted p-3 rounded-lg leading-relaxed">
                          {(editedTask || parsedTask).description}
                        </p>
                      </div>
                    )}

                    {/* Due Date */}
                    <div className="flex items-center gap-3">
                      <Calendar className="h-5 w-5 text-muted-foreground" />
                      <span className="text-base">
                        {format((editedTask || parsedTask).dueAt, 'EEEE, MMMM dd, yyyy')}
                      </span>
                    </div>

                    {/* Priority */}
                    <div className="flex items-center gap-3">
                      <Flag className="h-5 w-5 text-muted-foreground" />
                      <Badge className={cn("text-sm px-3 py-1", getPriorityColor((editedTask || parsedTask).priority))}>
                        {(editedTask || parsedTask).priority} Priority
                      </Badge>
                    </div>

                    {/* Tags */}
                    {(editedTask || parsedTask).tags.length > 0 && (
                      <div className="flex items-start gap-3">
                        <Tag className="h-5 w-5 text-muted-foreground mt-0.5" />
                        <div className="flex flex-wrap gap-1">
                          {(editedTask || parsedTask).tags.map((tag, index) => (
                            <Badge key={index} variant="secondary" className="text-xs">
                              #{tag}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Subtasks (View only) */}
                    {(editedTask || parsedTask).subtasks && (editedTask || parsedTask).subtasks!.length > 0 && (
                      <div className="space-y-2">
                        <span className="text-base font-medium text-muted-foreground">
                          Subtasks:
                        </span>
                        <ul className="list-disc pl-6 space-y-1">
                          {(editedTask || parsedTask).subtasks!.map((st, i) => (
                            <li key={i} className="text-sm text-foreground">{st}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </>
                )}
              </CardContent>
            </Card>
          ) : (
            <Card className="border-dashed border-2 min-h-[300px]">
              <CardContent className="flex items-center justify-center h-full">
                <div className="text-center space-y-2">
                  <Sparkles className="h-12 w-12 mx-auto text-muted-foreground/50" />
                  <p className="text-base text-muted-foreground">
                    {t('smartParser.noPreview', 'Type a task and click "Preview" to see the parsed result')}
                  </p>
                  <p className="text-sm text-muted-foreground/70">
                    The AI will generate a title, description, priority, and tags
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Cancel Button (only show if onCancel is provided) */}
      {onCancel && (
        <div className="flex justify-start">
          <Button variant="outline" onClick={onCancel}>
            {t('common.cancel', 'Cancel')}
          </Button>
        </div>
      )}
    </div>
  );
}

export default SmartTaskParser;
