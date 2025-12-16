import React, { useState, useEffect, useRef } from 'react';
import { AgencyTheme, ThemeColors } from '../../types';
import { useData } from '../../context/DataContext';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { usePlanPermissions } from '../../hooks/usePlanPermissions';
import { extractColorsFromImage, extractColorsFromUrl, generateColorPalettes, ColorPalette } from '../../utils/colorExtractor';
import { logger } from '../../utils/logger';
import { 
  Palette, Sparkles, Type, Square, Circle, Lock, 
  Image as ImageIcon, Upload, Save, Loader, 
  ChevronDown, ChevronUp, Wand2, Eye, X
} from 'lucide-react';

interface AgencyThemeManagerProps {
  agencyId: string;
  currentTheme?: AgencyTheme | null;
  onSave: (theme: Partial<AgencyTheme>) => Promise<void>;
  onLogoUpload?: (file: File) => Promise<string>;
  currentLogoUrl?: string;
}

// Font pairs configuration
const FONT_PAIRS = {
  modern: {
    name: 'Moderno',
    primary: 'Inter, system-ui, sans-serif',
    secondary: 'Inter, system-ui, sans-serif',
    description: 'Limpo e profissional'
  },
  classic: {
    name: 'Clássico',
    primary: '"Playfair Display", serif',
    secondary: '"Lora", serif',
    description: 'Elegante e sofisticado'
  },
  playful: {
    name: 'Descontraído',
    primary: '"Comfortaa", cursive',
    secondary: '"Nunito", sans-serif',
    description: 'Alegre e amigável'
  }
};

export const AgencyThemeManager: React.FC<AgencyThemeManagerProps> = ({
  agencyId,
  currentTheme,
  onSave,
  onLogoUpload,
  currentLogoUrl
}) => {
  const { user } = useAuth();
  const { showToast } = useToast();
  const planPermissions = usePlanPermissions();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const logoFileInputRef = useRef<HTMLInputElement>(null);

  const isPremium = planPermissions.plan === 'PREMIUM';
  const isBasic = planPermissions.plan === 'BASIC';

  // Form state
  const [themeForm, setThemeForm] = useState<Partial<AgencyTheme>>(() => ({
    colors: currentTheme?.colors || { primary: '#3b82f6', secondary: '#f97316', background: '#f9fafb', text: '#111827' },
    fontPair: currentTheme?.fontPair || 'modern',
    borderRadius: currentTheme?.borderRadius || 'soft',
    buttonStyle: currentTheme?.buttonStyle || 'solid',
    headerStyle: currentTheme?.headerStyle || 'solid',
    backgroundImage: currentTheme?.backgroundImage,
    backgroundBlur: currentTheme?.backgroundBlur || 0,
    backgroundOpacity: currentTheme?.backgroundOpacity || 1,
  }));

  const [loading, setLoading] = useState(false);
  const [extractingColors, setExtractingColors] = useState(false);
  const [showColorSuggestion, setShowColorSuggestion] = useState(false);
  const [suggestedPalettes, setSuggestedPalettes] = useState<ColorPalette[]>([]);
  const [selectedPaletteIndex, setSelectedPaletteIndex] = useState<number>(0);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['identity']));
  const [previewLogo, setPreviewLogo] = useState<string | null>(currentLogoUrl || null);
  
  // Update preview when currentLogoUrl changes (e.g., after instant upload)
  useEffect(() => {
    if (currentLogoUrl) {
      setPreviewLogo(currentLogoUrl);
    }
  }, [currentLogoUrl]);

  // Update form when theme changes
  useEffect(() => {
    if (currentTheme) {
      setThemeForm({
        colors: currentTheme.colors || { primary: '#3b82f6', secondary: '#f97316', background: '#f9fafb', text: '#111827' },
        fontPair: currentTheme.fontPair || 'modern',
        borderRadius: currentTheme.borderRadius || 'soft',
        buttonStyle: currentTheme.buttonStyle || 'solid',
        headerStyle: currentTheme.headerStyle || 'solid',
        backgroundImage: currentTheme.backgroundImage,
        backgroundBlur: currentTheme.backgroundBlur || 0,
        backgroundOpacity: currentTheme.backgroundOpacity || 1,
      });
    }
  }, [currentTheme]);

  // Magic Setup: Extract colors from logo
  const handleLogoUpload = async (file: File) => {
    if (!onLogoUpload) {
      showToast('Upload de logo não configurado', 'error');
      return;
    }
    
    setLoading(true);
    setExtractingColors(true);
    
    try {
      // Upload logo (this now updates immediately via updateUser in AgencyDashboard)
      const logoUrl = await onLogoUpload(file);
      
      // Update preview immediately
      setPreviewLogo(logoUrl);

      // Extract colors
      const colors = await extractColorsFromImage(file);
      if (colors) {
        // Generate 3 palettes from dominant color
        const palettes = generateColorPalettes(colors.dominant);
        setSuggestedPalettes(palettes);
        setSelectedPaletteIndex(0); // Default to first palette (Vibrant)
        setShowColorSuggestion(true);
      }

      // Toast is already shown by the parent component, so we don't need to show it here
    } catch (error: any) {
      logger.error('Error uploading logo or extracting colors:', error);
      showToast('Erro ao processar logo. Tente novamente.', 'error');
    } finally {
      setExtractingColors(false);
      setLoading(false);
    }
  };

  // Apply suggested colors
  const applySuggestedColors = () => {
    logger.debug('applySuggestedColors called', { suggestedPalettes, selectedPaletteIndex });
    
    if (suggestedPalettes.length === 0) {
      logger.warn('No suggested palettes available');
      showToast('Nenhuma paleta disponível', 'error');
      return;
    }
    
    if (selectedPaletteIndex < 0 || selectedPaletteIndex >= suggestedPalettes.length) {
      logger.warn('Invalid palette index', selectedPaletteIndex);
      showToast('Paleta selecionada inválida', 'error');
      return;
    }
    
    const selectedPalette = suggestedPalettes[selectedPaletteIndex];
    logger.debug('Applying palette:', selectedPalette);
    
    setThemeForm(prev => {
      const updated = {
        ...prev,
        colors: {
          ...prev.colors!,
          primary: selectedPalette.primary,
          secondary: selectedPalette.secondary,
        }
      };
      logger.debug('Updated themeForm:', updated);
      return updated;
    });
    
    setShowColorSuggestion(false);
    showToast('Cores aplicadas! Ajuste se necessário e clique em Salvar.', 'success');
  };

  // Extract colors from existing logo URL
  const handleExtractFromExistingLogo = async () => {
    if (!currentLogoUrl) {
      showToast('Nenhum logo encontrado', 'info');
      return;
    }

    setExtractingColors(true);
    try {
      const colors = await extractColorsFromUrl(currentLogoUrl);
      // Generate 3 palettes from dominant color
      const palettes = generateColorPalettes(colors.dominant);
      setSuggestedPalettes(palettes);
      setSelectedPaletteIndex(0); // Default to first palette (Vibrant)
      setShowColorSuggestion(true);
      showToast('Cores extraídas do logo atual!', 'success');
    } catch (error: any) {
      logger.error('Error extracting colors:', error);
      showToast('Erro ao extrair cores. Tente fazer upload de um novo logo.', 'error');
    } finally {
      setExtractingColors(false);
    }
  };

  // Toggle section
  const toggleSection = (section: string) => {
    setExpandedSections(prev => {
      const next = new Set(prev);
      if (next.has(section)) {
        next.delete(section);
      } else {
        next.add(section);
      }
      return next;
    });
  };

  // Handle save
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await onSave(themeForm);
      showToast('Tema salvo com sucesso!', 'success');
    } catch (error: any) {
      showToast(`Erro ao salvar tema: ${error.message}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  // Update color
  const updateColor = (key: keyof ThemeColors, value: string) => {
    setThemeForm(prev => ({
      ...prev,
      colors: {
        ...prev.colors!,
        [key]: value
      }
    }));
  };

  // Premium Preview component
  const PreviewCard = () => {
    const fontConfig = FONT_PAIRS[themeForm.fontPair || 'modern'];
    const borderRadiusMap = {
      none: '0px',
      soft: '8px',
      full: '24px'
    };
    const borderRadius = borderRadiusMap[themeForm.borderRadius || 'soft'];
    const buttonStyle = themeForm.buttonStyle || 'solid';

    return (
      <div 
        className="bg-white rounded-3xl border-2 border-gray-200 overflow-hidden shadow-2xl"
        style={{
          fontFamily: fontConfig.primary,
        }}
      >
        {/* Premium Header Preview */}
        <div 
          className={`p-6 ${themeForm.headerStyle === 'transparent' ? 'bg-gradient-to-r from-gray-50 to-gray-100' : 'bg-white'}`}
          style={{ 
            borderBottom: `2px solid ${themeForm.colors?.primary}20`,
          }}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              {previewLogo && (
                <div 
                  className="rounded-xl overflow-hidden shadow-lg border-2"
                  style={{ 
                    borderColor: themeForm.colors?.primary + '40',
                    borderRadius 
                  }}
                >
                  <img src={previewLogo} alt="Logo" className="w-14 h-14 object-cover" />
                </div>
              )}
              <div>
                <div 
                  className="h-5 mb-2 rounded font-bold text-white flex items-center px-3"
                  style={{ 
                    backgroundColor: themeForm.colors?.primary,
                    borderRadius,
                    width: '140px'
                  }}
                >
                  Nome da Agência
                </div>
                <div 
                  className="h-3 rounded"
                  style={{ 
                    backgroundColor: themeForm.colors?.secondary + '40',
                    width: '100px',
                    borderRadius
                  }}
                />
              </div>
            </div>
            <div className="flex gap-2">
              <div 
                className="w-10 h-10 rounded-full"
                style={{ backgroundColor: themeForm.colors?.primary + '20', borderRadius }}
              />
              <div 
                className="w-10 h-10 rounded-full"
                style={{ backgroundColor: themeForm.colors?.secondary + '20', borderRadius }}
              />
            </div>
          </div>
        </div>

        {/* Content Preview */}
        <div className="p-6 space-y-6">
          {/* Hero Section Preview */}
          <div 
            className="rounded-2xl p-8 relative overflow-hidden"
            style={{ 
              background: `linear-gradient(135deg, ${themeForm.colors?.primary}15 0%, ${themeForm.colors?.secondary}15 100%)`,
              borderRadius 
            }}
          >
            {isPremium && themeForm.backgroundImage && (
              <div
                className="absolute inset-0 bg-cover bg-center opacity-30"
                style={{
                  backgroundImage: `url(${themeForm.backgroundImage})`,
                  filter: `blur(${themeForm.backgroundBlur || 0}px)`,
                }}
              />
            )}
            <div className="relative z-10">
              <div 
                className="h-6 mb-3 rounded font-bold"
                style={{ 
                  backgroundColor: themeForm.colors?.primary,
                  width: '200px',
                  borderRadius,
                  opacity: 0.9
                }}
              />
              <div 
                className="h-4 rounded"
                style={{ 
                  backgroundColor: themeForm.colors?.secondary,
                  width: '150px',
                  borderRadius,
                  opacity: 0.7
                }}
              />
            </div>
          </div>

          {/* Button Preview */}
          <div className="space-y-4">
            <div className="flex gap-3 flex-wrap">
              <button
                className={`px-6 py-3 font-bold transition-all shadow-lg hover:scale-105`}
                style={{
                  borderRadius,
                  ...(buttonStyle === 'solid' ? {
                    backgroundColor: themeForm.colors?.primary,
                    color: 'white',
                    border: 'none'
                  } : buttonStyle === 'outline' ? {
                    backgroundColor: 'transparent',
                    color: themeForm.colors?.primary,
                    border: `2px solid ${themeForm.colors?.primary}`
                  } : {
                    backgroundColor: 'transparent',
                    color: themeForm.colors?.primary,
                    border: 'none'
                  })
                }}
              >
                Botão Principal
              </button>
              <button
                className="px-6 py-3 font-bold transition-all border-2 hover:scale-105"
                style={{
                  borderRadius,
                  borderColor: themeForm.colors?.secondary,
                  color: themeForm.colors?.secondary,
                  backgroundColor: 'transparent'
                }}
              >
                Botão Secundário
              </button>
            </div>
            
            <div 
              className="text-sm p-4 rounded-xl"
              style={{ 
                fontFamily: fontConfig.secondary,
                backgroundColor: themeForm.colors?.primary + '08',
                color: themeForm.colors?.text || '#374151',
                borderRadius
              }}
            >
              <p className="font-bold mb-1">Texto de exemplo</p>
              <p className="text-xs opacity-75">
                Esta é uma prévia de como o tema {fontConfig.name.toLowerCase()} aparecerá no seu site.
              </p>
            </div>
          </div>

          {/* Color Swatches */}
          <div className="flex items-center gap-4 pt-4 border-t border-gray-200">
            <div className="text-xs font-bold text-gray-500 uppercase tracking-wider">Cores do Tema</div>
            <div className="flex gap-2">
              <div 
                className="w-8 h-8 rounded-lg shadow-md border-2 border-white"
                style={{ backgroundColor: themeForm.colors?.primary }}
                title={themeForm.colors?.primary}
              />
              <div 
                className="w-8 h-8 rounded-lg shadow-md border-2 border-white"
                style={{ backgroundColor: themeForm.colors?.secondary }}
                title={themeForm.colors?.secondary}
              />
              <div 
                className="w-8 h-8 rounded-lg shadow-md border-2 border-white"
                style={{ backgroundColor: themeForm.colors?.background || '#f9fafb' }}
                title={themeForm.colors?.background}
              />
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-8">
      {/* Premium Header */}
      <div className="bg-gradient-to-br from-primary-50 via-white to-secondary-50 rounded-3xl border-2 border-primary-100 p-8 shadow-xl">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="p-4 bg-gradient-to-br from-primary-500 to-primary-600 rounded-2xl shadow-lg">
              <Sparkles className="text-white" size={32} />
            </div>
            <div>
              <h2 className="text-4xl font-extrabold text-gray-900 mb-2 flex items-center gap-3">
                Smart Site Builder
                <span className="text-xs bg-gradient-to-r from-primary-600 to-secondary-600 text-white px-3 py-1 rounded-full font-bold uppercase tracking-wider">
                  Premium
                </span>
              </h2>
              <p className="text-gray-600 text-lg">Personalize a identidade visual da sua agência com ferramentas profissionais</p>
            </div>
          </div>
        </div>
      </div>

      {/* Color Suggestion Modal */}
      {showColorSuggestion && suggestedPalettes.length > 0 && (
        <div className="bg-gradient-to-r from-primary-50 to-secondary-50 border-2 border-primary-200 rounded-2xl p-6 mb-6 animate-[fadeIn_0.3s]">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-3">
              <Wand2 className="text-primary-600" size={24} />
              <div>
                <h3 className="font-bold text-gray-900 mb-1">Cores extraídas do seu logo!</h3>
                <p className="text-sm text-gray-600">Escolha uma das paletas abaixo para aplicar:</p>
              </div>
            </div>
            <button
              onClick={() => setShowColorSuggestion(false)}
              className="text-gray-400 hover:text-gray-600"
            >
              <X size={20} />
            </button>
          </div>
          
          {/* Palette Selection Grid - Now with 6 palettes */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
            {suggestedPalettes.map((palette, index) => (
              <button
                key={index}
                onClick={() => setSelectedPaletteIndex(index)}
                className={`p-4 rounded-xl border-2 transition-all text-left ${
                  selectedPaletteIndex === index
                    ? 'border-primary-500 ring-2 ring-primary-500 ring-offset-2 bg-white shadow-lg'
                    : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-md'
                }`}
              >
                <div className="flex items-center gap-3 mb-3">
                  <div className="flex gap-2">
                    <div
                      className="w-10 h-10 rounded-full border-2 border-white shadow-md"
                      style={{ backgroundColor: palette.primary }}
                    />
                    <div
                      className="w-10 h-10 rounded-full border-2 border-white shadow-md"
                      style={{ backgroundColor: palette.secondary }}
                    />
                  </div>
                  <span className="font-bold text-gray-900">{palette.name}</span>
                </div>
                <div className="text-xs text-gray-500 space-y-1">
                  <div className="font-mono">{palette.primary}</div>
                  <div className="font-mono">{palette.secondary}</div>
                </div>
              </button>
            ))}
          </div>
          
          <div className="flex gap-3">
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                applySuggestedColors();
              }}
              className="bg-primary-600 text-white px-6 py-2.5 rounded-lg font-bold hover:bg-primary-700 transition-colors flex items-center gap-2"
            >
              <Sparkles size={18} />
              Aplicar Cores
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setShowColorSuggestion(false);
              }}
              className="bg-white border-2 border-gray-200 text-gray-700 px-6 py-2.5 rounded-lg font-bold hover:bg-gray-50 transition-colors"
            >
              Não, obrigado
            </button>
          </div>
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-4">
        {/* Section 1: 🎨 Identidade (Grátis) */}
        <div className="bg-white rounded-3xl border-2 border-gray-200 overflow-hidden shadow-lg hover:shadow-xl transition-shadow">
          <button
            type="button"
            onClick={() => toggleSection('identity')}
            className="w-full flex items-center justify-between p-8 hover:bg-gradient-to-r hover:from-primary-50/50 hover:to-transparent transition-all"
          >
            <div className="flex items-center gap-4">
              <div className="p-3 bg-gradient-to-br from-primary-100 to-primary-200 rounded-xl">
                <Palette className="text-primary-600" size={28} />
              </div>
              <div className="text-left">
                <h3 className="text-xl font-extrabold text-gray-900 mb-1">Identidade Visual</h3>
                <p className="text-sm text-gray-600">Logo e cores principais da sua marca</p>
              </div>
            </div>
            {expandedSections.has('identity') ? (
              <ChevronUp className="text-primary-600" size={24} />
            ) : (
              <ChevronDown className="text-gray-400" size={24} />
            )}
          </button>

          {expandedSections.has('identity') && (
            <div className="px-8 pb-8 space-y-8 border-t-2 border-gray-100 bg-gradient-to-b from-white to-gray-50/50">
              {/* Logo Upload with Magic Setup */}
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-3">
                  Logo da Agência
                  {onLogoUpload && (
                    <span className="ml-2 text-xs text-primary-600 font-normal">
                      ✨ Magic Setup: Extrai cores automaticamente
                    </span>
                  )}
                </label>
                <div className="flex items-center gap-4">
                  {previewLogo && (
                    <div className="relative">
                      <img 
                        src={previewLogo} 
                        alt="Logo preview" 
                        className="w-20 h-20 rounded-lg object-cover border-2 border-gray-200"
                      />
                      {currentLogoUrl && (
                        <button
                          type="button"
                          onClick={handleExtractFromExistingLogo}
                          disabled={extractingColors}
                          className="absolute -top-2 -right-2 bg-primary-600 text-white p-1.5 rounded-full shadow-lg hover:bg-primary-700 transition-colors disabled:opacity-50"
                          title="Extrair cores do logo"
                        >
                          {extractingColors ? (
                            <Loader size={14} className="animate-spin" />
                          ) : (
                            <Wand2 size={14} />
                          )}
                        </button>
                      )}
                    </div>
                  )}
                  <div className="flex-1">
                    <input
                      ref={logoFileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleLogoUpload(file);
                      }}
                      className="hidden"
                    />
                    <button
                      type="button"
                      onClick={() => logoFileInputRef.current?.click()}
                      disabled={extractingColors || !onLogoUpload}
                      className="flex items-center gap-2 px-4 py-2.5 bg-gray-100 hover:bg-gray-200 rounded-lg font-medium text-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {extractingColors ? (
                        <>
                          <Loader size={18} className="animate-spin" />
                          Processando...
                        </>
                      ) : (
                        <>
                          <Upload size={18} />
                          {previewLogo ? 'Alterar Logo' : 'Fazer Upload'}
                        </>
                      )}
                    </button>
                    {onLogoUpload && (
                      <p className="text-xs text-gray-500 mt-2">
                        Ao fazer upload, as cores serão extraídas automaticamente
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Color Pickers */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-3">Cor Primária</label>
                  <div className="flex items-center gap-3">
                    <input
                      type="color"
                      value={themeForm.colors?.primary || '#3b82f6'}
                      onChange={(e) => updateColor('primary', e.target.value)}
                      className="w-16 h-16 rounded-xl border-2 border-gray-300 cursor-pointer shadow-sm"
                    />
                    <div className="flex-1">
                      <input
                        type="text"
                        value={themeForm.colors?.primary || '#3b82f6'}
                        onChange={(e) => updateColor('primary', e.target.value)}
                        className="w-full border-2 border-gray-200 p-3 rounded-lg text-sm font-mono uppercase bg-gray-50 focus:ring-2 focus:ring-primary-500"
                        placeholder="#3b82f6"
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-3">Cor Secundária</label>
                  <div className="flex items-center gap-3">
                    <input
                      type="color"
                      value={themeForm.colors?.secondary || '#f97316'}
                      onChange={(e) => updateColor('secondary', e.target.value)}
                      className="w-16 h-16 rounded-xl border-2 border-gray-300 cursor-pointer shadow-sm"
                    />
                    <div className="flex-1">
                      <input
                        type="text"
                        value={themeForm.colors?.secondary || '#f97316'}
                        onChange={(e) => updateColor('secondary', e.target.value)}
                        className="w-full border-2 border-gray-200 p-3 rounded-lg text-sm font-mono uppercase bg-gray-50 focus:ring-2 focus:ring-primary-500"
                        placeholder="#f97316"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Section 2: 🔠 Tipografia & Estilo */}
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
          <button
            type="button"
            onClick={() => toggleSection('typography')}
            className="w-full flex items-center justify-between p-6 hover:bg-gray-50 transition-colors"
          >
            <div className="flex items-center gap-3">
              <Type className="text-primary-600" size={24} />
              <div className="text-left">
                <h3 className="text-lg font-bold text-gray-900">Tipografia & Estilo</h3>
                <p className="text-sm text-gray-500">
                  {isBasic || isPremium ? 'Fontes, cantos e botões' : '🔒 Upgrade para desbloquear'}
                </p>
              </div>
            </div>
            {expandedSections.has('typography') ? (
              <ChevronUp className="text-gray-400" size={20} />
            ) : (
              <ChevronDown className="text-gray-400" size={20} />
            )}
          </button>

          {expandedSections.has('typography') && (
            <div className="px-6 pb-6 space-y-6 border-t border-gray-100">
              {/* Font Pair */}
              <div className={!isBasic && !isPremium ? 'opacity-50 pointer-events-none relative' : ''}>
                {(!isBasic && !isPremium) && (
                  <div className="absolute inset-0 flex items-center justify-center z-10">
                    <div className="bg-white/90 backdrop-blur-sm rounded-lg p-3 border-2 border-gray-200 shadow-lg flex items-center gap-2">
                      <Lock size={18} className="text-gray-400" />
                      <span className="text-sm font-bold text-gray-600">Upgrade para desbloquear</span>
                    </div>
                  </div>
                )}
                <label className="block text-sm font-bold text-gray-700 mb-3">Família de Fontes</label>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {Object.entries(FONT_PAIRS).map(([key, config]) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setThemeForm(prev => ({ ...prev, fontPair: key as any }))}
                      className={`p-4 rounded-xl border-2 transition-all text-left ${
                        themeForm.fontPair === key
                          ? 'border-primary-600 bg-primary-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="font-bold mb-1" style={{ fontFamily: config.primary }}>
                        {config.name}
                      </div>
                      <div className="text-xs text-gray-500" style={{ fontFamily: config.secondary }}>
                        {config.description}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Border Radius */}
              <div className={!isBasic && !isPremium ? 'opacity-50 pointer-events-none relative' : ''}>
                {(!isBasic && !isPremium) && (
                  <div className="absolute inset-0 flex items-center justify-center z-10">
                    <div className="bg-white/90 backdrop-blur-sm rounded-lg p-3 border-2 border-gray-200 shadow-lg flex items-center gap-2">
                      <Lock size={18} className="text-gray-400" />
                      <span className="text-sm font-bold text-gray-600">Upgrade para desbloquear</span>
                    </div>
                  </div>
                )}
                <label className="block text-sm font-bold text-gray-700 mb-3">Cantos (Border Radius)</label>
                <div className="flex gap-4">
                  {(['none', 'soft', 'full'] as const).map((radius) => (
                    <button
                      key={radius}
                      type="button"
                      onClick={() => setThemeForm(prev => ({ ...prev, borderRadius: radius }))}
                      className={`flex-1 p-4 rounded-xl border-2 transition-all ${
                        themeForm.borderRadius === radius
                          ? 'border-primary-600 bg-primary-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="flex items-center justify-center gap-2 mb-2">
                        {radius === 'none' ? (
                          <Square size={24} className="text-gray-600" />
                        ) : radius === 'soft' ? (
                          <div className="w-6 h-6 rounded bg-gray-600" />
                        ) : (
                          <Circle size={24} className="text-gray-600" />
                        )}
                      </div>
                      <div className="text-sm font-bold text-gray-700 capitalize">
                        {radius === 'none' ? 'Quadrado' : radius === 'soft' ? 'Suave' : 'Redondo'}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Button Style */}
              <div className={!isBasic && !isPremium ? 'opacity-50 pointer-events-none relative' : ''}>
                {(!isBasic && !isPremium) && (
                  <div className="absolute inset-0 flex items-center justify-center z-10">
                    <div className="bg-white/90 backdrop-blur-sm rounded-lg p-3 border-2 border-gray-200 shadow-lg flex items-center gap-2">
                      <Lock size={18} className="text-gray-400" />
                      <span className="text-sm font-bold text-gray-600">Upgrade para desbloquear</span>
                    </div>
                  </div>
                )}
                <label className="block text-sm font-bold text-gray-700 mb-3">Estilo de Botões</label>
                <div className="flex gap-4">
                  {(['solid', 'outline', 'ghost'] as const).map((style) => (
                    <button
                      key={style}
                      type="button"
                      onClick={() => setThemeForm(prev => ({ ...prev, buttonStyle: style }))}
                      className={`flex-1 p-4 rounded-xl border-2 transition-all ${
                        themeForm.buttonStyle === style
                          ? 'border-primary-600 bg-primary-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="mb-2">
                        <button
                          type="button"
                          className={`px-4 py-2 rounded-lg font-bold text-sm ${
                            style === 'solid'
                              ? 'bg-primary-600 text-white'
                              : style === 'outline'
                              ? 'border-2 border-primary-600 text-primary-600 bg-transparent'
                              : 'text-primary-600 bg-transparent'
                          }`}
                          style={{ backgroundColor: style === 'solid' ? themeForm.colors?.primary : undefined }}
                        >
                          Exemplo
                        </button>
                      </div>
                      <div className="text-sm font-bold text-gray-700 capitalize">
                        {style === 'solid' ? 'Sólido' : style === 'outline' ? 'Borda' : 'Fantasma'}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Section 3: 🖼️ Plano de Fundo (Premium) */}
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
          <button
            type="button"
            onClick={() => toggleSection('background')}
            className="w-full flex items-center justify-between p-6 hover:bg-gray-50 transition-colors"
          >
            <div className="flex items-center gap-3">
              <ImageIcon className="text-primary-600" size={24} />
              <div className="text-left">
                <h3 className="text-lg font-bold text-gray-900">Plano de Fundo</h3>
                <p className="text-sm text-gray-500">
                  {isPremium ? 'Imagem de fundo personalizada' : '🔒 Premium - Upgrade para desbloquear'}
                </p>
              </div>
            </div>
            {expandedSections.has('background') ? (
              <ChevronUp className="text-gray-400" size={20} />
            ) : (
              <ChevronDown className="text-gray-400" size={20} />
            )}
          </button>

          {expandedSections.has('background') && (
            <div className="px-6 pb-6 space-y-6 border-t border-gray-100">
              {!isPremium ? (
                <div className="bg-gradient-to-r from-purple-50 to-pink-50 border-2 border-purple-200 rounded-xl p-6 text-center">
                  <Lock size={48} className="text-purple-400 mx-auto mb-4" />
                  <h4 className="font-bold text-gray-900 mb-2">Recurso Premium</h4>
                  <p className="text-sm text-gray-600 mb-4">
                    Upgrade para Premium para desbloquear plano de fundo personalizado
                  </p>
                  <button
                    type="button"
                    onClick={() => showToast('Funcionalidade de upgrade em desenvolvimento', 'info')}
                    className="bg-purple-600 text-white px-6 py-2.5 rounded-lg font-bold hover:bg-purple-700 transition-colors"
                  >
                    Fazer Upgrade
                  </button>
                </div>
              ) : (
                <>
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-3">Imagem de Fundo</label>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          const reader = new FileReader();
                          reader.onload = (event) => {
                            const url = event.target?.result as string;
                            setThemeForm(prev => ({ ...prev, backgroundImage: url }));
                          };
                          reader.readAsDataURL(file);
                        }
                      }}
                      className="hidden"
                    />
                    <div className="flex items-center gap-4">
                      {themeForm.backgroundImage && (
                        <div className="relative">
                          <img
                            src={themeForm.backgroundImage}
                            alt="Background preview"
                            className="w-32 h-20 rounded-lg object-cover border-2 border-gray-200"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              setThemeForm(prev => ({ ...prev, backgroundImage: undefined }));
                              if (fileInputRef.current) fileInputRef.current.value = '';
                            }}
                            className="absolute -top-2 -right-2 bg-red-500 text-white p-1 rounded-full hover:bg-red-600"
                          >
                            <X size={14} />
                          </button>
                        </div>
                      )}
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="flex items-center gap-2 px-4 py-2.5 bg-gray-100 hover:bg-gray-200 rounded-lg font-medium text-gray-700 transition-colors"
                      >
                        <Upload size={18} />
                        {themeForm.backgroundImage ? 'Alterar Imagem' : 'Fazer Upload'}
                      </button>
                    </div>
                  </div>

                  {themeForm.backgroundImage && (
                    <>
                      <div>
                        <label className="block text-sm font-bold text-gray-700 mb-3">
                          Intensidade do Blur: {themeForm.backgroundBlur || 0}px
                        </label>
                        <input
                          type="range"
                          min="0"
                          max="20"
                          value={themeForm.backgroundBlur || 0}
                          onChange={(e) => setThemeForm(prev => ({ ...prev, backgroundBlur: Number(e.target.value) }))}
                          className="w-full"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-bold text-gray-700 mb-3">
                          Opacidade: {Math.round((themeForm.backgroundOpacity || 1) * 100)}%
                        </label>
                        <input
                          type="range"
                          min="0"
                          max="100"
                          value={(themeForm.backgroundOpacity || 1) * 100}
                          onChange={(e) => setThemeForm(prev => ({ ...prev, backgroundOpacity: Number(e.target.value) / 100 }))}
                          className="w-full"
                        />
                      </div>
                    </>
                  )}
                </>
              )}
            </div>
          )}
        </div>

        {/* Premium Preview Section */}
        <div className="bg-gradient-to-br from-gray-50 via-white to-primary-50/30 rounded-3xl border-2 border-gray-200 p-8 shadow-2xl">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-gradient-to-br from-primary-500 to-primary-600 rounded-xl shadow-lg">
                <Eye className="text-white" size={28} />
              </div>
              <div>
                <h3 className="text-2xl font-extrabold text-gray-900">Preview em Tempo Real</h3>
                <p className="text-sm text-gray-600">Veja como seu site ficará antes de publicar</p>
              </div>
            </div>
          </div>
          <div className="transform hover:scale-[1.01] transition-transform duration-300">
            <PreviewCard />
          </div>
        </div>

        {/* Premium Save Button */}
        <div className="bg-gradient-to-br from-white to-gray-50 rounded-3xl border-2 border-gray-200 p-6 shadow-xl">
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-primary-600 to-primary-700 text-white py-5 rounded-2xl font-extrabold text-xl hover:from-primary-700 hover:to-primary-800 flex items-center justify-center gap-3 disabled:opacity-50 shadow-2xl transition-all hover:scale-[1.02] hover:shadow-primary-500/50"
            style={{ 
              background: loading 
                ? undefined 
                : `linear-gradient(135deg, ${themeForm.colors?.primary} 0%, ${themeForm.colors?.secondary} 100%)`
            }}
          >
            {loading ? (
              <>
                <Loader size={24} className="animate-spin" />
                <span>Salvando tema...</span>
              </>
            ) : (
              <>
                <Save size={24} />
                <span>Salvar Tema Personalizado</span>
              </>
            )}
          </button>
          <p className="text-center text-xs text-gray-500 mt-4">
            ✨ Suas alterações serão aplicadas imediatamente no site da sua agência
          </p>
        </div>
      </form>
    </div>
  );
};

