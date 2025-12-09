import React, { useMemo } from 'react';
import { Agency, Trip } from '../../types';
import { slugify } from '../../utils/slugify';
import { AlertTriangle, CheckCircle, XCircle, Info, ExternalLink } from 'lucide-react';

interface SlugIssue {
  type: 'empty' | 'duplicate' | 'invalid' | 'warning';
  entity: 'agency' | 'trip';
  id: string;
  name: string;
  currentSlug: string;
  expectedSlug?: string;
  message: string;
}

interface SlugCheckerProps {
  agencies: Agency[];
  trips: Trip[];
}

const SlugChecker: React.FC<SlugCheckerProps> = ({ agencies, trips }) => {
  const analysis = useMemo(() => {
    const issues: SlugIssue[] = [];
    const agencySlugMap = new Map<string, string[]>();
    const tripSlugMap = new Map<string, string[]>();

    // Validar formato de slug
    const isValidSlug = (slug: string): boolean => {
      if (!slug || slug.trim() === '') return false;
      const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
      return slugPattern.test(slug);
    };

    // Analisar agências
    agencies.forEach((agency) => {
      const currentSlug = agency.slug || '';
      const name = agency.name || 'Sem nome';
      const id = agency.id || agency.agencyId || 'unknown';

      if (!currentSlug || currentSlug.trim() === '') {
        issues.push({
          type: 'empty',
          entity: 'agency',
          id,
          name,
          currentSlug: '',
          message: `Agência não possui slug. URL não funcionará corretamente.`,
        });
        return;
      }

      if (!isValidSlug(currentSlug)) {
        issues.push({
          type: 'invalid',
          entity: 'agency',
          id,
          name,
          currentSlug,
          message: `Slug inválido: contém caracteres não permitidos.`,
        });
      }

      // Verificar se slug tem números aleatórios (padrão comum)
      if (/\d{3,}$/.test(currentSlug)) {
        const expectedSlug = slugify(name);
        if (currentSlug !== expectedSlug) {
          issues.push({
            type: 'warning',
            entity: 'agency',
            id,
            name,
            currentSlug,
            expectedSlug,
            message: `Slug contém números aleatórios. Sugerido: "${expectedSlug}"`,
          });
        }
      }

      if (!agencySlugMap.has(currentSlug)) {
        agencySlugMap.set(currentSlug, []);
      }
      agencySlugMap.get(currentSlug)!.push(`${name} (${id})`);
    });

    // Analisar viagens
    trips.forEach((trip) => {
      const currentSlug = trip.slug || '';
      const name = trip.title || 'Sem título';
      const id = trip.id || 'unknown';

      if (!currentSlug || currentSlug.trim() === '') {
        issues.push({
          type: 'empty',
          entity: 'trip',
          id,
          name,
          currentSlug: '',
          message: `Viagem não possui slug. URL não funcionará corretamente.`,
        });
        return;
      }

      if (!isValidSlug(currentSlug)) {
        issues.push({
          type: 'invalid',
          entity: 'trip',
          id,
          name,
          currentSlug,
          message: `Slug inválido: contém caracteres não permitidos.`,
        });
      }

      if (!tripSlugMap.has(currentSlug)) {
        tripSlugMap.set(currentSlug, []);
      }
      tripSlugMap.get(currentSlug)!.push(`${name} (${id})`);
    });

    // Identificar duplicatas
    agencySlugMap.forEach((entities, slug) => {
      if (entities.length > 1) {
        issues.push({
          type: 'duplicate',
          entity: 'agency',
          id: 'multiple',
          name: entities.join(', '),
          currentSlug: slug,
          message: `Slug usado por ${entities.length} agências: ${entities.join(', ')}`,
        });
      }
    });

    tripSlugMap.forEach((entities, slug) => {
      if (entities.length > 1) {
        issues.push({
          type: 'duplicate',
          entity: 'trip',
          id: 'multiple',
          name: entities.join(', '),
          currentSlug: slug,
          message: `Slug usado por ${entities.length} viagens: ${entities.join(', ')}`,
        });
      }
    });

    return {
      issues,
      summary: {
        total: issues.length,
        critical: issues.filter(i => i.type === 'empty' || i.type === 'duplicate' || i.type === 'invalid').length,
        warnings: issues.filter(i => i.type === 'warning').length,
      },
    };
  }, [agencies, trips]);

  const { issues, summary } = analysis;

  const getIssueIcon = (type: SlugIssue['type']) => {
    switch (type) {
      case 'empty':
      case 'invalid':
      case 'duplicate':
        return <XCircle size={16} className="text-red-500" />;
      case 'warning':
        return <AlertTriangle size={16} className="text-amber-500" />;
      default:
        return <Info size={16} className="text-blue-500" />;
    }
  };

  const getIssueColor = (type: SlugIssue['type']) => {
    switch (type) {
      case 'empty':
      case 'invalid':
      case 'duplicate':
        return 'border-red-200 bg-red-50';
      case 'warning':
        return 'border-amber-200 bg-amber-50';
      default:
        return 'border-blue-200 bg-blue-50';
    }
  };

  const emptyIssues = issues.filter(i => i.type === 'empty');
  const invalidIssues = issues.filter(i => i.type === 'invalid');
  const duplicateIssues = issues.filter(i => i.type === 'duplicate');
  const warningIssues = issues.filter(i => i.type === 'warning');

  if (summary.total === 0) {
    return (
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        <div className="flex items-center gap-3 mb-4">
          <CheckCircle size={24} className="text-green-500" />
          <h3 className="text-xl font-bold text-gray-900">Verificação de Slugs</h3>
        </div>
        <p className="text-gray-600">✅ Todos os slugs estão corretos! Nenhum problema encontrado.</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <AlertTriangle size={24} className="text-amber-500" />
          <h3 className="text-xl font-bold text-gray-900">Verificação de Slugs</h3>
        </div>
        <div className="flex gap-4 text-sm">
          <div className="flex items-center gap-2">
            <span className="text-gray-500">Total:</span>
            <span className="font-bold text-gray-900">{summary.total}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-red-500">Críticos:</span>
            <span className="font-bold text-red-600">{summary.critical}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-amber-500">Avisos:</span>
            <span className="font-bold text-amber-600">{summary.warnings}</span>
          </div>
        </div>
      </div>

      <div className="space-y-4 max-h-96 overflow-y-auto">
        {emptyIssues.length > 0 && (
          <div>
            <h4 className="text-sm font-bold text-red-600 mb-2 flex items-center gap-2">
              <XCircle size={14} /> Slugs Vazios ({emptyIssues.length})
            </h4>
            <div className="space-y-2">
              {emptyIssues.map((issue, idx) => (
                <div key={idx} className={`p-3 rounded-lg border ${getIssueColor(issue.type)}`}>
                  <div className="flex items-start gap-2">
                    {getIssueIcon(issue.type)}
                    <div className="flex-1">
                      <p className="font-medium text-gray-900">{issue.name}</p>
                      <p className="text-xs text-gray-600 mt-1">{issue.message}</p>
                      <p className="text-xs text-gray-500 mt-1">ID: {issue.id}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {invalidIssues.length > 0 && (
          <div>
            <h4 className="text-sm font-bold text-red-600 mb-2 flex items-center gap-2">
              <XCircle size={14} /> Slugs Inválidos ({invalidIssues.length})
            </h4>
            <div className="space-y-2">
              {invalidIssues.map((issue, idx) => (
                <div key={idx} className={`p-3 rounded-lg border ${getIssueColor(issue.type)}`}>
                  <div className="flex items-start gap-2">
                    {getIssueIcon(issue.type)}
                    <div className="flex-1">
                      <p className="font-medium text-gray-900">{issue.name}</p>
                      <p className="text-xs text-gray-600 mt-1">Slug atual: <code className="bg-gray-100 px-1 rounded">"{issue.currentSlug}"</code></p>
                      <p className="text-xs text-gray-600 mt-1">{issue.message}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {duplicateIssues.length > 0 && (
          <div>
            <h4 className="text-sm font-bold text-red-600 mb-2 flex items-center gap-2">
              <XCircle size={14} /> Slugs Duplicados ({duplicateIssues.length})
            </h4>
            <div className="space-y-2">
              {duplicateIssues.map((issue, idx) => (
                <div key={idx} className={`p-3 rounded-lg border ${getIssueColor(issue.type)}`}>
                  <div className="flex items-start gap-2">
                    {getIssueIcon(issue.type)}
                    <div className="flex-1">
                      <p className="font-medium text-gray-900">Slug: <code className="bg-gray-100 px-1 rounded">"{issue.currentSlug}"</code></p>
                      <p className="text-xs text-gray-600 mt-1">{issue.message}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {warningIssues.length > 0 && (
          <div>
            <h4 className="text-sm font-bold text-amber-600 mb-2 flex items-center gap-2">
              <AlertTriangle size={14} /> Avisos ({warningIssues.length})
            </h4>
            <div className="space-y-2">
              {warningIssues.map((issue, idx) => (
                <div key={idx} className={`p-3 rounded-lg border ${getIssueColor(issue.type)}`}>
                  <div className="flex items-start gap-2">
                    {getIssueIcon(issue.type)}
                    <div className="flex-1">
                      <p className="font-medium text-gray-900">{issue.name}</p>
                      <p className="text-xs text-gray-600 mt-1">
                        Atual: <code className="bg-gray-100 px-1 rounded">"{issue.currentSlug}"</code>
                        {issue.expectedSlug && (
                          <> → Sugerido: <code className="bg-gray-100 px-1 rounded">"{issue.expectedSlug}"</code></>
                        )}
                      </p>
                      <p className="text-xs text-gray-600 mt-1">{issue.message}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <p className="text-sm text-blue-900">
          <strong>💡 Dica:</strong> Consulte o arquivo <code className="bg-blue-100 px-1 rounded">SLUGS_ANALYSIS.md</code> para mais detalhes sobre como corrigir esses problemas.
        </p>
      </div>
    </div>
  );
};

export default SlugChecker;

