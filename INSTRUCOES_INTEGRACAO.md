# 📋 INSTRUÇÕES DE INTEGRAÇÃO — ViabilidadesPanel

## 1. types.ts — Adicionar campos à interface `Viability`

Localize a interface `Viability` (linha ~246) e adicione os campos novos:

```typescript
export interface Viability {
  id: string;
  companyId: number;
  address: string;
  date: string;
  status: 'VIÁVEL' | 'STAND BY' | 'EM ANÁLISE' | 'NÃO INICIADO';
  pdfSummary?: FileLink;
  versions: ViabilityVersion[];
  createdAt: string;

  // ── NOVOS CAMPOS ─────────────────────────────────────────────────
  titulo?: string;                    // nome descritivo do estudo
  responsavel?: string;               // responsável
  kanbanStatus?: KanbanStatus;        // coluna no kanban
  pdfConsultaPrefeitura?: FileLink;   // PDF obrigatório ao criar
  pdfLocalizacao?: FileLink;          // Arquivo obrigatório ao criar
  pdfEstudoTerceiro?: FileLink;       // PDF opcional
  obs?: string;                       // observações livres
}

// Adicione este tipo no arquivo também:
export type KanbanStatus =
  | 'em_aberto'
  | 'a_fazer'
  | 'estudos_finalizados'
  | 'dados_permuta'
  | 'contratos'
  | 'contratos_assinados';
```

---

## 2. types.ts — Adicionar `viabilities` à interface `DB`

Localize a interface `DB` (linha ~257) e adicione:

```typescript
export interface DB {
  projects: Project[];
  companies: Company[];
  team: string[];
  disciplines: Discipline[];
  activeProjectId: number | null;
  activeCompanyId: number | null;

  // ── NOVO CAMPO ───────────────────────────────────────────────────
  viabilities?: Viability[];   // ← adicione esta linha
}
```

---

## 3. constants.ts — Adicionar `viabilities` ao INITIAL_DB

Localize `INITIAL_DB` e adicione:

```typescript
export const INITIAL_DB: DB = {
  // ... campos existentes ...
  viabilities: [],   // ← adicione esta linha
};
```

---

## 4. App.tsx — Renderizar o painel na aba `viabilidade`

Localize onde a aba `viabilidade` é renderizada no JSX (procure por `activeTab === 'viabilidade'`).

**Substitua** o que estiver renderizando por:

```tsx
{activeTab === 'viabilidade' && (
  <ViabilidadesPanel
    companyId={activeCompany?.id || db.companies[0]?.id || 1}
    companyName={activeCompany?.name || db.companies[0]?.name || 'Empresa'}
  />
)}
```

> **Nota:** Os props `isOpen`, `onClose`, `viabilities`, `onAdd`, `onDelete`,
> `onAddVersion` e `onUpdateStatus` **não são mais necessários** — o painel
> gerencia tudo internamente via `useApp()`.

---

## 5. AppContext.tsx — Garantir que `viabilities` persiste

O AppContext já persiste o `db` inteiro no `localStorage`, então `viabilities` é
salvo automaticamente. Nenhuma mudança necessária aqui.

Se quiser adicionar ao patching do `handleImportJSON`, adicione dentro de `patchProject`
ou diretamente no objeto `importedData`:

```typescript
const importedData: DB = {
  ...INITIAL_DB,
  ...rawData,
  viabilities: Array.isArray(rawData.viabilities) ? rawData.viabilities : [],
  // ... resto dos campos
};
```

---

## Resumo das mudanças

| Arquivo                           | O que fazer                                      |
|-----------------------------------|--------------------------------------------------|
| `components/ViabilidadesPanel.tsx`| **Substituir** pelo arquivo novo gerado          |
| `types.ts`                        | Adicionar campos à `Viability` + `KanbanStatus` + `viabilities` em `DB` |
| `constants.ts`                    | Adicionar `viabilities: []` ao `INITIAL_DB`      |
| `App.tsx`                         | Simplificar renderização da aba `viabilidade`    |
| `contexts/AppContext.tsx`         | Adicionar `viabilities` no `handleImportJSON`    |
