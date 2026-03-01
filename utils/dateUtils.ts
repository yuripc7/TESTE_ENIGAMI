export const parseLocalDate = (dateStr?: string | null): Date => {
    if (!dateStr) return new Date();
    // Se a string já tiver time/timezone info, caímos no Date nativo
    if (dateStr.includes('T')) {
        return new Date(dateStr);
    }
    // Para strings puras YYYY-MM-DD
    const parts = dateStr.split('-');
    if (parts.length === 3) {
        return new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
    }
    return new Date(dateStr);
};

export const formatLocalDate = (dateStr?: string | null): string => {
    if (!dateStr) return '--/--/----';
    const d = parseLocalDate(dateStr);
    return isNaN(d.getTime()) ? '--/--/----' : d.toLocaleDateString('pt-BR');
};
