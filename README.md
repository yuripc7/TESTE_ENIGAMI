# ENIGAMI Dashboard

A high-performance project management dashboard built for technical teams. This application provides real-time tracking of project timelines, viability data, and activity logs.

## 🚀 Features

- **Dynamic Timeline**: Manage project phases (Planned vs. Executed) with dependency tracking and automatic delay calculation.
- **Viability Data**: Automatic calculation of potential based on built and saleable areas.
- **Activity Log**: Transparent tracking of all project updates and team interactions.
- **Team Management**: Role-based action tracking and workload visualization.
- **Gallery & Files**: Integrated management of project assets and documentation.

## 🛠️ Tech Stack

- **React 18** (Vite)
- **TypeScript**
- **Tailwind CSS**
- **Framer Motion** (Animations)
- **Google Gemini API** (Intelligent Reports)

## 📦 Installation & Setup

1. **Clone the repository**:
   ```bash
   git clone https://github.com/yuripc7/app-project-coordinate.git
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Configure Environment Variables**:
   Create a `.env.local` file in the root and add your Gemini API Key:
   ```env
   GEMINI_API_KEY=your_key_here
   ```

4. **Run Development Server**:
   ```bash
   npm run dev
   ```

5. **Build for Production**:
   ```bash
   npm run build
   ```

## ☁️ Supabase — Persistência do Workspace

Por padrão, autenticação e perfis já usam o Supabase. Para que **projetos, cronogramas,
checklists e agenda fiquem salvos na nuvem** (e não apenas no navegador de cada membro),
execute o script [`supabase_setup.sql`](supabase_setup.sql) uma única vez:

1. Abra o painel do seu projeto no [Supabase](https://supabase.com/dashboard).
2. Vá em **SQL Editor → New query**.
3. Cole o conteúdo de `supabase_setup.sql` e clique em **Run**.

Sem a tabela, o app continua funcionando normalmente (IndexedDB local + sincronização
em tempo real entre usuários online), mas os dados não ficam persistidos na nuvem.

## 🌐 Deployment

The project is configured for **GitHub Pages**. All builds are automatically deployed via GitHub Actions when pushing to the `main` branch.

---
*Created by ENIGAMI Team*
