/**
 * Script para verificar a integridade dos slugs no projeto ViajaStore
 * 
 * Este script verifica:
 * - Slugs vazios ou undefined
 * - Slugs duplicados
 * - Slugs inválidos (com caracteres especiais não permitidos)
 * - Slugs que não seguem o padrão slugify
 * - Problemas na geração de slugs
 */

import { slugify } from '../src/utils/slugify';

interface SlugIssue {
  type: 'empty' | 'duplicate' | 'invalid' | 'mismatch' | 'warning';
  entity: 'agency' | 'trip';
  id: string;
  name: string;
  currentSlug: string;
  expectedSlug?: string;
  message: string;
}

interface SlugAnalysis {
  agencies: {
    total: number;
    issues: SlugIssue[];
    duplicates: Map<string, string[]>;
  };
  trips: {
    total: number;
    issues: SlugIssue[];
    duplicates: Map<string, string[]>;
  };
  summary: {
    totalIssues: number;
    criticalIssues: number;
    warnings: number;
  };
}

/**
 * Valida se um slug está no formato correto
 */
function isValidSlug(slug: string): boolean {
  if (!slug || slug.trim() === '') return false;
  
  // Slug deve conter apenas letras minúsculas, números e hífens
  // Não pode começar ou terminar com hífen
  // Não pode ter hífens duplicados
  const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
  return slugPattern.test(slug);
}

/**
 * Verifica se o slug atual corresponde ao esperado baseado no nome
 */
function getExpectedSlug(name: string): string {
  return slugify(name);
}

/**
 * Analisa os slugs de agências e viagens
 */
export function analyzeSlugs(agencies: any[], trips: any[]): SlugAnalysis {
  const issues: SlugIssue[] = [];
  const agencySlugMap = new Map<string, string[]>();
  const tripSlugMap = new Map<string, string[]>();

  // Analisar agências
  agencies.forEach((agency) => {
    const currentSlug = agency.slug || '';
    const name = agency.name || 'Sem nome';
    const id = agency.id || agency.agencyId || 'unknown';

    // Verificar slug vazio
    if (!currentSlug || currentSlug.trim() === '') {
      issues.push({
        type: 'empty',
        entity: 'agency',
        id,
        name,
        currentSlug: '',
        message: `Agência "${name}" não possui slug. URL não funcionará corretamente.`,
      });
      return;
    }

    // Verificar slug inválido
    if (!isValidSlug(currentSlug)) {
      issues.push({
        type: 'invalid',
        entity: 'agency',
        id,
        name,
        currentSlug,
        message: `Slug inválido para agência "${name}": "${currentSlug}". Contém caracteres não permitidos.`,
      });
    }

    // Verificar se slug corresponde ao nome (aviso, não erro)
    const expectedSlug = getExpectedSlug(name);
    if (currentSlug !== expectedSlug && !currentSlug.includes('-')) {
      // Se o slug não tem hífen mas deveria ter, pode ser um problema
      if (name.includes(' ') && !currentSlug.includes('-')) {
        issues.push({
          type: 'warning',
          entity: 'agency',
          id,
          name,
          currentSlug,
          expectedSlug,
          message: `Slug da agência "${name}" pode não ser SEO-friendly. Esperado: "${expectedSlug}", Atual: "${currentSlug}"`,
        });
      }
    }

    // Registrar para verificação de duplicatas
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

    // Verificar slug vazio
    if (!currentSlug || currentSlug.trim() === '') {
      issues.push({
        type: 'empty',
        entity: 'trip',
        id,
        name,
        currentSlug: '',
        message: `Viagem "${name}" não possui slug. URL não funcionará corretamente.`,
      });
      return;
    }

    // Verificar slug inválido
    if (!isValidSlug(currentSlug)) {
      issues.push({
        type: 'invalid',
        entity: 'trip',
        id,
        name,
        currentSlug,
        message: `Slug inválido para viagem "${name}": "${currentSlug}". Contém caracteres não permitidos.`,
      });
    }

    // Verificar se slug corresponde ao título (aviso, não erro)
    const expectedSlug = getExpectedSlug(name);
    if (currentSlug !== expectedSlug && !currentSlug.includes('-')) {
      if (name.includes(' ') && !currentSlug.includes('-')) {
        issues.push({
          type: 'warning',
          entity: 'trip',
          id,
          name,
          currentSlug,
          expectedSlug,
          message: `Slug da viagem "${name}" pode não ser SEO-friendly. Esperado: "${expectedSlug}", Atual: "${currentSlug}"`,
        });
      }
    }

    // Registrar para verificação de duplicatas
    if (!tripSlugMap.has(currentSlug)) {
      tripSlugMap.set(currentSlug, []);
    }
    tripSlugMap.get(currentSlug)!.push(`${name} (${id})`);
  });

  // Identificar duplicatas de agências
  agencySlugMap.forEach((entities, slug) => {
    if (entities.length > 1) {
      issues.push({
        type: 'duplicate',
        entity: 'agency',
        id: 'multiple',
        name: entities.join(', '),
        currentSlug: slug,
        message: `Slug duplicado para agências: "${slug}" usado por ${entities.length} agências: ${entities.join(', ')}`,
      });
    }
  });

  // Identificar duplicatas de viagens
  tripSlugMap.forEach((entities, slug) => {
    if (entities.length > 1) {
      issues.push({
        type: 'duplicate',
        entity: 'trip',
        id: 'multiple',
        name: entities.join(', '),
        currentSlug: slug,
        message: `Slug duplicado para viagens: "${slug}" usado por ${entities.length} viagens: ${entities.join(', ')}`,
      });
    }
  });

  const criticalIssues = issues.filter(i => i.type === 'empty' || i.type === 'duplicate' || i.type === 'invalid').length;
  const warnings = issues.filter(i => i.type === 'warning').length;

  return {
    agencies: {
      total: agencies.length,
      issues: issues.filter(i => i.entity === 'agency'),
      duplicates: agencySlugMap,
    },
    trips: {
      total: trips.length,
      issues: issues.filter(i => i.entity === 'trip'),
      duplicates: tripSlugMap,
    },
    summary: {
      totalIssues: issues.length,
      criticalIssues,
      warnings,
    },
  };
}

/**
 * Gera um relatório formatado
 */
export function generateSlugReport(analysis: SlugAnalysis): string {
  let report = '\n';
  report += '═══════════════════════════════════════════════════════════════\n';
  report += '           RELATÓRIO DE ANÁLISE DE SLUGS - VIAJASTORE\n';
  report += '═══════════════════════════════════════════════════════════════\n\n';

  // Resumo
  report += '📊 RESUMO GERAL\n';
  report += '───────────────────────────────────────────────────────────────\n';
  report += `Total de Agências: ${analysis.agencies.total}\n`;
  report += `Total de Viagens: ${analysis.trips.total}\n`;
  report += `Total de Problemas: ${analysis.summary.totalIssues}\n`;
  report += `  ⚠️  Críticos: ${analysis.summary.criticalIssues}\n`;
  report += `  ℹ️  Avisos: ${analysis.summary.warnings}\n\n`;

  // Problemas de Agências
  if (analysis.agencies.issues.length > 0) {
    report += '🏢 PROBLEMAS COM SLUGS DE AGÊNCIAS\n';
    report += '───────────────────────────────────────────────────────────────\n';
    
    const empty = analysis.agencies.issues.filter(i => i.type === 'empty');
    const duplicates = analysis.agencies.issues.filter(i => i.type === 'duplicate');
    const invalid = analysis.agencies.issues.filter(i => i.type === 'invalid');
    const warnings = analysis.agencies.issues.filter(i => i.type === 'warning');

    if (empty.length > 0) {
      report += `\n❌ SLUGS VAZIOS (${empty.length}):\n`;
      empty.forEach(issue => {
        report += `   • ${issue.name} (ID: ${issue.id})\n`;
        report += `     ${issue.message}\n`;
      });
    }

    if (invalid.length > 0) {
      report += `\n❌ SLUGS INVÁLIDOS (${invalid.length}):\n`;
      invalid.forEach(issue => {
        report += `   • ${issue.name} (ID: ${issue.id})\n`;
        report += `     Slug atual: "${issue.currentSlug}"\n`;
        report += `     ${issue.message}\n`;
      });
    }

    if (duplicates.length > 0) {
      report += `\n⚠️  SLUGS DUPLICADOS (${duplicates.length}):\n`;
      duplicates.forEach(issue => {
        report += `   • Slug: "${issue.currentSlug}"\n`;
        report += `     ${issue.message}\n`;
      });
    }

    if (warnings.length > 0) {
      report += `\nℹ️  AVISOS (${warnings.length}):\n`;
      warnings.forEach(issue => {
        report += `   • ${issue.name}\n`;
        report += `     ${issue.message}\n`;
      });
    }
    report += '\n';
  }

  // Problemas de Viagens
  if (analysis.trips.issues.length > 0) {
    report += '✈️  PROBLEMAS COM SLUGS DE VIAGENS\n';
    report += '───────────────────────────────────────────────────────────────\n';
    
    const empty = analysis.trips.issues.filter(i => i.type === 'empty');
    const duplicates = analysis.trips.issues.filter(i => i.type === 'duplicate');
    const invalid = analysis.trips.issues.filter(i => i.type === 'invalid');
    const warnings = analysis.trips.issues.filter(i => i.type === 'warning');

    if (empty.length > 0) {
      report += `\n❌ SLUGS VAZIOS (${empty.length}):\n`;
      empty.forEach(issue => {
        report += `   • ${issue.name} (ID: ${issue.id})\n`;
        report += `     ${issue.message}\n`;
      });
    }

    if (invalid.length > 0) {
      report += `\n❌ SLUGS INVÁLIDOS (${invalid.length}):\n`;
      invalid.forEach(issue => {
        report += `   • ${issue.name} (ID: ${issue.id})\n`;
        report += `     Slug atual: "${issue.currentSlug}"\n`;
        report += `     ${issue.message}\n`;
      });
    }

    if (duplicates.length > 0) {
      report += `\n⚠️  SLUGS DUPLICADOS (${duplicates.length}):\n`;
      duplicates.forEach(issue => {
        report += `   • Slug: "${issue.currentSlug}"\n`;
        report += `     ${issue.message}\n`;
      });
    }

    if (warnings.length > 0) {
      report += `\nℹ️  AVISOS (${warnings.length}):\n`;
      warnings.forEach(issue => {
        report += `   • ${issue.name}\n`;
        report += `     ${issue.message}\n`;
      });
    }
    report += '\n';
  }

  // Recomendações
  report += '💡 RECOMENDAÇÕES\n';
  report += '───────────────────────────────────────────────────────────────\n';
  
  if (analysis.summary.criticalIssues > 0) {
    report += '1. Corrija todos os slugs vazios e inválidos imediatamente\n';
    report += '2. Resolva conflitos de slugs duplicados\n';
    report += '3. Implemente validação de unicidade no banco de dados\n';
  } else {
    report += '✅ Nenhum problema crítico encontrado!\n';
  }
  
  report += '4. Considere adicionar validação de slug único ao criar/editar\n';
  report += '5. Implemente geração automática de slug se não fornecido\n';
  report += '6. Adicione índice único no banco para slugs de agências e viagens\n';

  report += '\n═══════════════════════════════════════════════════════════════\n';

  return report;
}

// Para uso em Node.js (se necessário)
if (typeof require !== 'undefined' && require.main === module) {
  console.log('Este script deve ser importado e usado com dados do Supabase.');
  console.log('Use: import { analyzeSlugs, generateSlugReport } from "./scripts/check-slugs"');
}

