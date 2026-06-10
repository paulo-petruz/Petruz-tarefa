# Petruz Tasks

Gerenciador de tarefas da empresa Petruz — um "ClickUp simplificado" com
espaços de trabalho, tarefas com status/responsável/prazos, alertas de
vencimento e painel geral de andamento.

## Stack

- **Next.js 14** (App Router) + **TypeScript** + **Node.js**
- **shadcn/ui** + Tailwind CSS — temas **claro e escuro** em tons de açaí (roxo)
- **SQL Server** (servidor existente) — as tabelas são **criadas
  automaticamente** na primeira conexão
- Autenticação própria: senhas com hash **bcrypt** e sessão em cookie
  **JWT (httpOnly)**

## Como rodar

1. Copie `.env.example` para `.env.local` e ajuste a conexão com o seu
   SQL Server (o banco informado em `DB_NAME` precisa existir; as tabelas
   são inicializadas pelo sistema). Gere um `AUTH_SECRET` próprio:

   ```bash
   openssl rand -hex 32
   ```

2. Instale e suba o servidor de desenvolvimento:

   ```bash
   npm install
   npm run dev
   ```

3. Acesse <http://localhost:3000>, crie sua conta em **Cadastre-se** e
   comece criando um **espaço de trabalho**.

Para produção: `npm run build && npm start`.

## Funcionalidades

- **Usuários**: cadastro com e-mail + senha hasheada (bcrypt, custo 12);
  sessão JWT assinada (HS256) em cookie httpOnly; middleware protege todas
  as rotas do app.
- **Autorização**: acesso a um espaço restrito aos seus membros; gestão
  (membros/exclusão) restrita a admins do espaço; o dono entra como admin.
  **Edição/exclusão de tarefa e subtarefas** restritas ao **responsável**
  (admins do espaço editam tudo; tarefas sem responsável: quem criou).
  Os demais membros veem tudo em modo somente leitura.
- **Espaços de trabalho**: criação com cor e descrição; convite de membros
  pelo e-mail cadastrado; papéis admin/membro.
- **Tarefas**: título, descrição, status (A Fazer, Em Andamento, Em Revisão,
  Concluída), prioridade, responsável, data de início e vencimento; edição,
  exclusão e mudança rápida de status; visualização em **lista**, **quadro**
  e **por pessoa** — cada membro do espaço tem uma "pasta" com contadores
  por status e % médio; clicar na pasta abre a página da pessoa com apenas
  as tarefas dela (visão padrão).
- **Painel por workspace**: a rota Painel mostra um cartão por espaço com
  contagens por status, barra de andamento e alertas de vencimento do espaço.
- **Progresso**: % de conclusão por tarefa — digitado manualmente (inline ou
  no diálogo) ou calculado automaticamente pelas subtarefas quando existem;
  tarefas concluídas contam como 100%.
- **Subtarefas**: checklist dentro de cada tarefa.
- **Acompanhamento**: cartões por status (A Fazer, Em Andamento, Em Revisão,
  Concluída) e barra de andamento geral no topo de cada espaço.
- **Alertas de vencimento**: badges "Vencida / Vence hoje / Vence amanhã"
  nas tarefas e seção de alertas no painel (vencidas + próximos 3 dias).
- **Painel**: totais por status, alertas de vencimento e andamento por
  espaço com barras de progresso.
- **Tema**: claro/escuro (toggle na barra superior), paleta açaí.

## Super admin e reset de senha

Promova um usuário a **super admin** direto no banco:

```sql
UPDATE dbo.Users SET Role = 'superadmin' WHERE Email = 'email@exemplo.com';
```

O usuário promovido passa a ver o item **Administração** no menu (vale na
hora, sem novo login — o papel é lido do banco a cada acesso). Na página
`/admin` ele vê todos os usuários e pode **resetar a senha** de qualquer um
(com gerador de senha aleatória); a nova senha é hasheada com bcrypt.

## Estrutura do banco (criada automaticamente)

| Tabela | Descrição |
| --- | --- |
| `Users` | usuários com e-mail único e hash de senha |
| `Workspaces` | espaços de trabalho (nome, cor, dono) |
| `WorkspaceMembers` | membros por espaço com papel `admin`/`member` |
| `Tasks` | tarefas com status, prioridade, responsável e prazos |
| `Subtasks` | subtarefas (checklist) de cada tarefa, base do % de conclusão |
