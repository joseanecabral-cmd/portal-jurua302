# Portal Juruá302

Gestão documental privada para locação do apartamento no Portal Juruá302, Joinville SC.

---

## Pré-requisitos

- Node.js 20+
- Conta no [Supabase](https://supabase.com) (plano gratuito é suficiente para começar)
- Conta na [Vercel](https://vercel.com)

---

## 1. Configuração do Supabase

### 1.1 Criar projeto

1. Acesse [supabase.com](https://supabase.com) e clique em **New project**
2. Escolha um nome (ex: `portal-jurua`) e uma senha forte para o banco
3. Região: **South America (São Paulo)** — mais próximo do Brasil
4. Aguarde a criação (cerca de 2 minutos)

### 1.2 Executar a migração SQL

1. No painel do Supabase, acesse **SQL Editor → New query**
2. Cole todo o conteúdo do arquivo `supabase/migrations/001_schema.sql`
3. Clique em **Run**
4. Aguarde — a migração criará todas as tabelas, políticas RLS e o bucket de storage

### 1.3 Copiar as credenciais

1. Acesse **Settings → API**
2. Copie:
   - **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
   - **anon public key** → `NEXT_PUBLIC_SUPABASE_ANON_KEY`

### 1.4 Criar usuários iniciais

Os usuários são criados pelo administrador via **Authentication → Users → Invite user** no Supabase.

Após criar um usuário, altere o `role` dele na tabela `profiles` via SQL:

```sql
UPDATE public.profiles
SET role = 'admin', full_name = 'Josimar Cabral'
WHERE email = 'josimar@email.com';

UPDATE public.profiles
SET role = 'owner', full_name = 'Nome da Proprietária'
WHERE email = 'proprietaria@email.com';
```

Roles disponíveis: `owner` | `admin` | `applicant` | `tenant`

### 1.5 Configurar e-mail (opcional mas recomendado)

Para que a recuperação de senha e convites funcionem:

1. Acesse **Authentication → Email Templates**
2. Ajuste os textos para português
3. Em **Settings → Auth → SMTP Settings**, configure um servidor SMTP próprio
   (recomendado: [Resend](https://resend.com) — gratuito até 3000 e-mails/mês)

---

## 2. Instalação local

```bash
cd portal-jurua
npm install
```

Crie o arquivo de ambiente:

```bash
cp .env.local.example .env.local
```

Edite `.env.local` com suas credenciais do Supabase:

```env
NEXT_PUBLIC_SUPABASE_URL=https://SEU_PROJETO.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sua_anon_key_aqui
```

Inicie o servidor de desenvolvimento:

```bash
npm run dev
```

Acesse: [http://localhost:3000](http://localhost:3000)

---

## 3. Deploy na Vercel

### 3.1 Via GitHub (recomendado)

1. Faça push do projeto para um repositório privado no GitHub
2. Acesse [vercel.com](https://vercel.com) → **Add New Project**
3. Importe o repositório
4. Em **Environment Variables**, adicione:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
5. Clique em **Deploy**

### 3.2 Via CLI

```bash
npm install -g vercel
vercel login
vercel --prod
```

Durante o deploy, a Vercel pedirá as variáveis de ambiente.

### 3.3 URL personalizada (opcional)

Em **Settings → Domains** na Vercel, adicione um domínio próprio como `jurua.seudominio.com.br`.

Após configurar o domínio, atualize no Supabase:
- **Authentication → URL Configuration → Site URL**: `https://jurua.seudominio.com.br`
- **Redirect URLs**: `https://jurua.seudominio.com.br/**`

---

## 4. Instalar como PWA (celular / tablet)

O portal pode ser instalado na tela inicial sem precisar da App Store.

**iPhone / iPad:**
1. Abra o portal no Safari
2. Toque em Compartilhar (ícone de caixa com seta)
3. Role e toque em **Adicionar à Tela de Início**

**Android:**
1. Abra no Chrome
2. Menu (três pontos) → **Adicionar à tela inicial**

**Windows / Mac:**
1. Abra no Chrome ou Edge
2. Clique no ícone de instalação na barra de endereços

> Para que os ícones PWA apareçam corretamente, adicione os arquivos:
> - `public/icons/icon-192.png` (192×192 px)
> - `public/icons/icon-512.png` (512×512 px)

---

## 5. Estrutura do projeto

```
portal-jurua/
├── src/
│   ├── app/
│   │   ├── (auth)/login/          # Página de login e recuperação de senha
│   │   └── (protected)/           # Área privada (requer autenticação)
│   │       ├── layout.tsx         # Layout com sidebar responsiva
│   │       ├── dashboard/         # Painel inicial
│   │       ├── documentos/        # Envio e acompanhamento de documentos
│   │       ├── admin/             # Revisão e aprovação (admin/owner)
│   │       ├── contrato/          # Contrato de locação
│   │       ├── vistoria/          # Laudos, fotos e vídeos de vistoria
│   │       ├── caucao/            # Caução e comprovantes
│   │       ├── manual/            # Manual do apartamento
│   │       ├── condominio/        # Documentos do condomínio
│   │       ├── boletos-contas/    # Boletos e comprovantes
│   │       └── manutencao/        # Histórico de manutenção
│   ├── components/
│   │   ├── layout/                # Sidebar, Header
│   │   ├── ui/                    # StatusBadge e outros
│   │   └── FileUpload.tsx         # Componente de upload com drag & drop
│   ├── lib/
│   │   ├── supabase/              # Clientes browser e server
│   │   └── utils.ts               # Formatação de datas, moeda, bytes
│   └── types/index.ts             # Tipos TypeScript + labels em PT-BR
├── supabase/migrations/           # SQL completo para execução no Supabase
├── middleware.ts                  # Proteção de rotas e refresh de sessão
└── public/manifest.json           # Configuração PWA
```

---

## 6. Perfis de acesso

| Perfil | Acesso |
|--------|--------|
| `owner` | Leitura total — não opera, apenas acompanha |
| `admin` | Operação completa — upload, aprovação, gestão |
| `applicant` | Envia documentos, acompanha status |
| `tenant` | Acessa contrato, vistoria, boletos, manual, manutenção |

Para alterar o perfil de um usuário:

```sql
UPDATE public.profiles SET role = 'tenant' WHERE email = 'inquilino@email.com';
```

---

## 7. Limites e custos

| Item | Supabase Gratuito | Supabase Pro (USD 25/mês) |
|------|-------------------|--------------------------|
| Storage | 1 GB | 100 GB |
| Transferência | 2 GB/mês | 200 GB/mês |
| Uploads | 50 MB por arquivo | 50 MB por arquivo |
| Usuários | Ilimitado | Ilimitado |

**Recomendação:** o plano gratuito é suficiente enquanto os vídeos de vistoria forem poucos. Se houver muitos vídeos, migre para o Pro ou hospede vídeos no Google Drive e insira o link nas observações.

---

## 8. Manutenção

### Backup dos dados

No Supabase: **Settings → Database → Backups** — backups diários automáticos (Pro) ou manual (Free).

### Remover usuário

```sql
-- No Supabase: Authentication → Users → deletar pela interface
-- O perfil na tabela profiles será removido automaticamente (CASCADE)
```

### Adicionar novo candidato

1. Supabase → **Authentication → Users → Invite user**
2. O usuário receberá e-mail para definir senha
3. Role padrão: `applicant` — altere para `tenant` após aprovação

---

## Suporte

Portal desenvolvido para uso privado — Portal Juruá302, Joinville SC.
