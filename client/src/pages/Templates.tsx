import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import { Edit, FileText, Plus, Search, Trash2, X } from 'lucide-react';
import { useConfirm } from '../contexts/ConfirmContext';
import { useTheme } from '../contexts/ThemeContext';
import { useToast } from '../contexts/ToastContext';
import type { SMSTemplate } from '../types';

const STORAGE_KEY = 'cms_sms_templates';

const loadTemplates = (): SMSTemplate[] => {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
  } catch {
    return [];
  }
};

const saveTemplates = (templates: SMSTemplate[]) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(templates));
  window.dispatchEvent(new CustomEvent('sms-templates-updated', { detail: { templates } }));
};

export function Templates() {
  const navigate = useNavigate();
  const toast = useToast();
  const { confirm } = useConfirm();
  const { theme } = useTheme();
  const [templates, setTemplates] = useState<SMSTemplate[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<SMSTemplate | null>(null);

  useEffect(() => {
    const sync = () => setTemplates(loadTemplates());
    sync();
    window.addEventListener('sms-templates-updated', sync as EventListener);
    window.addEventListener('storage', sync);
    return () => {
      window.removeEventListener('sms-templates-updated', sync as EventListener);
      window.removeEventListener('storage', sync);
    };
  }, []);

  const filteredTemplates = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return templates;
    return templates.filter((template) => {
      const searchable = [template.name, template.type, template.content, ...(template.variables || [])].join(' ').toLowerCase();
      return searchable.includes(q);
    });
  }, [templates, searchQuery]);

  const updateTemplates = (updated: SMSTemplate[]) => {
    setTemplates(updated);
    saveTemplates(updated);
  };

  const deleteTemplate = async (id: string) => {
    const confirmed = await confirm({
      title: 'Delete Template',
      message: 'Are you sure you want to delete this template?',
      confirmText: 'Delete',
      danger: true,
    });
    if (!confirmed) return;
    const updated = templates.filter((template) => template.id !== id);
    updateTemplates(updated);
    toast.success('Template deleted');
  };

  const pageBg = theme === 'dark' ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-neutral-200';
  const textMain = theme === 'dark' ? 'text-slate-50' : 'text-neutral-900';
  const textMuted = theme === 'dark' ? 'text-slate-300' : 'text-neutral-600';
  const inputClass = theme === 'dark'
    ? 'w-full pl-10 pr-4 py-2 border border-slate-700 rounded-lg bg-slate-950 text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-primary-500'
    : 'w-full pl-10 pr-4 py-2 border border-neutral-300 rounded-lg bg-white text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-primary-500';

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto">
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className={`text-xl sm:text-2xl font-bold ${textMain}`}>SMS Templates</h1>
          <p className={`text-sm sm:text-base ${textMuted}`}>Create and manage reusable SMS message templates</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate('/messaging')}
            className={`px-4 py-2 rounded-lg border text-sm font-semibold transition-colors ${theme === 'dark' ? 'border-slate-700 bg-slate-950 text-slate-200 hover:bg-slate-900' : 'border-neutral-200 bg-white text-neutral-700 hover:bg-neutral-50'}`}
          >
            Back to Messaging
          </button>
          <button
            onClick={() => setShowModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-900 text-white text-sm font-semibold shadow-lg shadow-blue-950/20"
          >
            <Plus className="w-4 h-4" />
            Add Template
          </button>
        </div>
      </div>

      <div className={`rounded-xl border shadow-sm overflow-hidden ${pageBg}`}>
        <div className={`border-b ${theme === 'dark' ? 'border-slate-800' : 'border-neutral-200'} p-4 sm:p-6`}>
          <div className="relative max-w-2xl">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-400" />
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search templates by name, type, content, or variable..."
              className={inputClass}
            />
          </div>
        </div>

        <div className="p-4 sm:p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredTemplates.map((template) => (
              <div key={template.id} className={`rounded-lg p-6 border ${theme === 'dark' ? 'bg-slate-950 border-slate-800' : 'bg-neutral-50 border-neutral-200'}`}>
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                      <h4 className={`${textMain} font-semibold truncate`}>{template.name}</h4>
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs ${template.isActive ? 'bg-success-50 text-success-700 dark:bg-emerald-500/10 dark:text-emerald-300' : 'bg-neutral-200 text-neutral-600 dark:bg-slate-800 dark:text-slate-300'}`}>
                        {template.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                    <span className="inline-flex items-center px-2 py-0.5 bg-info-50 text-info-700 text-xs rounded-full capitalize">
                      {template.type.replace('_', ' ')}
                    </span>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => setEditingTemplate(template)}
                      className={`p-2 rounded-lg transition-colors ${theme === 'dark' ? 'text-slate-300 hover:bg-slate-800' : 'text-primary-600 hover:bg-gray-50'}`}
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => deleteTemplate(template.id)}
                      className={`p-2 rounded-lg transition-colors ${theme === 'dark' ? 'text-rose-300 hover:bg-slate-800' : 'text-danger-600 hover:bg-danger-50'}`}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <p className={`text-sm rounded border p-3 mb-3 ${theme === 'dark' ? 'text-slate-200 bg-slate-900 border-slate-800' : 'text-neutral-700 bg-white border-neutral-200'}`}>
                  {template.content}
                </p>

                {template.variables.length > 0 && (
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`text-xs ${textMuted}`}>Variables:</span>
                    {template.variables.map((variable) => (
                      <span key={variable} className={`inline-flex items-center px-2 py-0.5 text-xs rounded ${theme === 'dark' ? 'bg-slate-800 text-slate-200' : 'bg-accent-50 text-accent-700'}`}>
                        {`{{${variable}}}`}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>

          {filteredTemplates.length === 0 && (
            <div className="text-center py-12">
              <FileText className="w-12 h-12 text-neutral-300 mx-auto mb-4" />
              <p className={textMuted}>{searchQuery ? 'No templates match your search' : 'No templates found'}</p>
            </div>
          )}
        </div>
      </div>

      {(showModal || editingTemplate) && (
        <TemplateModal
          template={editingTemplate}
          onClose={() => {
            setShowModal(false);
            setEditingTemplate(null);
          }}
          onSave={(template) => {
            if (editingTemplate) {
              updateTemplates(templates.map((t) => (t.id === template.id ? template : t)));
            } else {
              updateTemplates([
                ...templates,
                { ...template, id: `template-${Date.now()}`, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
              ]);
            }
            setShowModal(false);
            setEditingTemplate(null);
            toast.success(editingTemplate ? 'Template updated' : 'Template added');
          }}
        />
      )}
    </div>
  );
}

function TemplateModal({
  template,
  onClose,
  onSave,
}: {
  template: SMSTemplate | null;
  onClose: () => void;
  onSave: (template: SMSTemplate) => void;
}) {
  const [formData, setFormData] = useState<Partial<SMSTemplate>>(
    template || {
      name: '',
      type: 'manual',
      content: '',
      variables: [],
      isActive: true,
    }
  );
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({ ...formData, updatedAt: new Date().toISOString() } as SMSTemplate);
  };

  const inputClass = isDark
    ? 'w-full px-4 py-2 border border-slate-700 rounded-lg bg-slate-950 text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-primary-500'
    : 'w-full px-4 py-2 border border-neutral-300 rounded-lg bg-white text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-primary-500';
  const modalCard = isDark ? 'bg-slate-900' : 'bg-white';
  const labelClass = isDark ? 'text-slate-200' : 'text-neutral-700';
  const borderClass = isDark ? 'border-slate-800' : 'border-neutral-200';

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className={`rounded-xl shadow-2xl w-full max-w-2xl ${modalCard}`}>
        <div className={`border-b ${borderClass} px-6 py-4 flex items-center justify-between`}>
          <h3 className={isDark ? 'text-slate-50' : 'text-neutral-900'}>{template ? 'Edit Template' : 'Add Template'}</h3>
          <button onClick={onClose} className={`p-2 rounded-lg transition-colors ${isDark ? 'hover:bg-slate-800 text-slate-200' : 'hover:bg-neutral-100 text-neutral-700'}`}>
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className={`block text-sm mb-2 ${labelClass}`}>Template Name *</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className={inputClass}
              required
            />
          </div>

          <div>
            <label className={`block text-sm mb-2 ${labelClass}`}>Message Content *</label>
            <textarea
              value={formData.content}
              onChange={(e) => setFormData({ ...formData, content: e.target.value })}
              className={inputClass}
              rows={4}
              placeholder="Use {{variable}} for dynamic content"
              required
            />
            <p className={`text-xs mt-1 ${isDark ? 'text-slate-400' : 'text-neutral-500'}`}>
              Available variables: name, church_name, program_name, date, time, location
            </p>
          </div>

          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="isActive"
              checked={formData.isActive}
              onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
              className="w-4 h-4 text-primary-600 border-neutral-300 rounded"
            />
            <label htmlFor="isActive" className={`text-sm ${labelClass}`}>
              Active Template
            </label>
          </div>

          <div className="flex items-center gap-3 pt-4">
            <button
              type="submit"
              className="flex-1 bg-blue-900 text-white py-2 rounded-lg hover:bg-blue-800 transition-colors"
            >
              {template ? 'Update Template' : 'Add Template'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className={`flex-1 py-2 rounded-lg transition-colors ${isDark ? 'bg-slate-800 text-slate-200 hover:bg-slate-700' : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200'}`}
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
