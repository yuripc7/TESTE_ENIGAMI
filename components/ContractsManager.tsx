import React, { useState } from 'react';
import { Project, DB, Contract, ContractInstallment } from '../types';
import { useApp } from '../contexts/AppContext';

interface ContractsManagerProps {
    project: Project;
    db: DB;
    onUpdateProject: (updated: Project) => void;
    currentUser: { name: string; avatar?: string } | null;
}

export const ContractsManager: React.FC<ContractsManagerProps> = ({ project, db, onUpdateProject, currentUser }) => {
    const { addLog, setNotification } = useApp();
    const [showForm, setShowForm] = useState(false);
    const [name, setName] = useState('');
    const [supplier, setSupplier] = useState('');
    const [totalValue, setTotalValue] = useState('');
    const [term, setTerm] = useState('');
    const [responsible, setResponsible] = useState('');
    const [linkedWork, setLinkedWork] = useState('');

    const contracts = project.contracts || [];

    const handleCreate = (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim() || !supplier.trim()) {
            setNotification('Preencha nome e fornecedor.');
            return;
        }

        const newContract: Contract = {
            id: `contract-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
            name: name.trim(),
            supplier: supplier.trim(),
            totalValue: parseFloat(totalValue) || 0,
            status: 'pending',
            createdAt: new Date().toISOString(),
            term: term.trim(),
            responsible: responsible.trim(),
            linkedWork: linkedWork.trim(),
            installments: [],
            disciplines: [],
            edits: [],
        };

        onUpdateProject({
            ...project,
            contracts: [...contracts, newContract],
            updatedAt: new Date().toISOString(),
        });

        addLog(currentUser?.name || 'SISTEMA', `CONTRATO CRIADO: ${name}`);
        setNotification('Contrato criado com sucesso!');
        setName('');
        setSupplier('');
        setTotalValue('');
        setTerm('');
        setResponsible('');
        setLinkedWork('');
        setShowForm(false);
    };

    const handleDelete = (contractId: string) => {
        onUpdateProject({
            ...project,
            contracts: contracts.filter(c => c.id !== contractId),
            updatedAt: new Date().toISOString(),
        });
        addLog(currentUser?.name || 'SISTEMA', 'CONTRATO REMOVIDO');
    };

    const handleToggleStatus = (contractId: string) => {
        const statusCycle: Contract['status'][] = ['pending', 'active', 'closed'];
        onUpdateProject({
            ...project,
            contracts: contracts.map(c => {
                if (c.id !== contractId) return c;
                const nextIdx = (statusCycle.indexOf(c.status) + 1) % statusCycle.length;
                return { ...c, status: statusCycle[nextIdx] };
            }),
            updatedAt: new Date().toISOString(),
        });
    };

    const statusLabel: Record<Contract['status'], string> = {
        pending: 'Pendente',
        active: 'Ativo',
        closed: 'Encerrado',
    };

    const statusColor: Record<Contract['status'], string> = {
        pending: 'text-yellow-500',
        active: 'text-green-500',
        closed: 'text-gray-400',
    };

    return (
        <div className="p-6 space-y-4">
            <div className="flex justify-between items-center">
                <h3 className="text-lg font-square font-bold text-theme-text tracking-wider uppercase flex items-center gap-2">
                    <span className="material-symbols-outlined text-theme-cyan">description</span>
                    Contratos
                </h3>
                <button onClick={() => setShowForm(!showForm)} className="px-3 py-1.5 bg-theme-orange text-white rounded-full text-xs font-bold hover:opacity-90 transition-opacity">
                    {showForm ? 'CANCELAR' : '+ NOVO'}
                </button>
            </div>

            {showForm && (
                <form onSubmit={handleCreate} className="space-y-3 p-4 bg-theme-bg rounded-xl border border-theme-divider">
                    <input type="text" placeholder="Nome do Contrato" value={name} onChange={e => setName(e.target.value)} className="w-full px-3 py-2 bg-theme-card border border-theme-divider rounded-lg text-theme-text text-sm" />
                    <input type="text" placeholder="Fornecedor" value={supplier} onChange={e => setSupplier(e.target.value)} className="w-full px-3 py-2 bg-theme-card border border-theme-divider rounded-lg text-theme-text text-sm" />
                    <div className="grid grid-cols-2 gap-3">
                        <input type="number" placeholder="Valor Total" value={totalValue} onChange={e => setTotalValue(e.target.value)} className="w-full px-3 py-2 bg-theme-card border border-theme-divider rounded-lg text-theme-text text-sm" />
                        <input type="text" placeholder="Prazo" value={term} onChange={e => setTerm(e.target.value)} className="w-full px-3 py-2 bg-theme-card border border-theme-divider rounded-lg text-theme-text text-sm" />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <input type="text" placeholder="Responsável" value={responsible} onChange={e => setResponsible(e.target.value)} className="w-full px-3 py-2 bg-theme-card border border-theme-divider rounded-lg text-theme-text text-sm" />
                        <input type="text" placeholder="Obra Vinculada" value={linkedWork} onChange={e => setLinkedWork(e.target.value)} className="w-full px-3 py-2 bg-theme-card border border-theme-divider rounded-lg text-theme-text text-sm" />
                    </div>
                    <button type="submit" className="w-full py-2 bg-theme-orange text-white rounded-lg text-sm font-bold hover:opacity-90">CRIAR CONTRATO</button>
                </form>
            )}

            {contracts.length === 0 && !showForm && (
                <p className="text-theme-textMuted text-sm text-center py-8">Nenhum contrato cadastrado.</p>
            )}

            <div className="space-y-2">
                {contracts.map(c => (
                    <div key={c.id} className="p-4 bg-theme-bg rounded-xl border border-theme-divider flex items-center justify-between gap-4">
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-bold text-theme-text truncate">{c.name}</p>
                            <p className="text-xs text-theme-textMuted">{c.supplier} &middot; {c.responsible}</p>
                        </div>
                        <button onClick={() => handleToggleStatus(c.id)} className={`text-xs font-bold ${statusColor[c.status]} hover:opacity-80`}>
                            {statusLabel[c.status]}
                        </button>
                        <span className="text-sm font-bold text-theme-text">
                            {c.totalValue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                        </span>
                        <button onClick={() => handleDelete(c.id)} className="text-red-500 hover:text-red-400 transition-colors">
                            <span className="material-symbols-outlined text-sm">delete</span>
                        </button>
                    </div>
                ))}
            </div>
        </div>
    );
};
