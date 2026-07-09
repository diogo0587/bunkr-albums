# BunkrDownloader Pro

Ferramenta web completa para extrair e baixar arquivos de álbuns Bunkr. Com busca integrada no balbums.st (600k+ álbuns), suporte a 40+ domínios, múltiplos proxies CORS e persistência local.

## Funcionalidades

- **Busca integrada** — Encontre álbuns no balbums.st com filtros por categoria
- **40+ domínios Bunkr suportados** — Todos os TLDs conhecidos
- **Resolução de URLs reais** — Extrai links diretos via API do Bunkr
- **Múltiplos proxies CORS** — Troque entre provedores se um falhar
- **Downloads em lote** — Processe múltiplas URLs
- **Persistência** — Downloads e histórico salvos no localStorage
- **Filtros avançados** — Incluir/excluir por extensão ou nome

## Deploy no Vercel

1. Fork este repositório no GitHub
2. Acesse [vercel.com](https://vercel.com) e importe o projeto
3. O framework preset será detectado automaticamente (Vite)
4. Clique em **Deploy**

## Deploy Local

```bash
npm install
npm run build
```

Os arquivos de build estarão em `dist/`.

## Tecnologias

- React 19 + TypeScript + Vite
- Tailwind CSS + shadcn/ui
- Framer Motion
- Zustand (estado + persistência)
