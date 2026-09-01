# SHEPER — Landing page / portfólio

Página de vendas e portfólio da **Sheper**, agência criativa para marcas de streetwear
e artistas. Site estático: HTML, CSS e JavaScript puros, sem build e sem dependências.

## Rodar localmente

```bash
python3 -m http.server 4141
# abra http://localhost:4141
```

Ou abra o `index.html` direto no navegador.

## Estrutura

| Caminho | Conteúdo |
|---|---|
| `index.html` | Página completa (12 seções) |
| `css/styles.css` | Design system: tokens, seções invertidas, componentes, responsivo |
| `js/main.js` | Header fixo, menu mobile, reveal on scroll, contadores, carrossel de cases, autoplay dos vídeos, lightbox |
| `assets/logo/` | Logo em PNG transparente (lockup, símbolo e wordmark, preto e branco) + favicons |
| `assets/img/` | 36 fotos otimizadas (máx. 1500px, JPEG progressivo) |
| `assets/video/` | 4 vídeos verticais comprimidos (360×640) + posters |
| `vercel.json` | Cache dos assets e headers básicos |

## Design

Monocromático — preto `#0A0A0A` e off-white `#F4F2EE` — puxado do próprio logo da
ovelha negra. As seções alternam entre as duas temperaturas: a classe `.invert` troca
todos os tokens de cor de uma vez, então "Números" e o CTA final saem claros sem
nenhuma regra duplicada.

Tipografia: **Archivo** (display), **Inter** (texto), **Caveat** (assinatura
manuscrita das seções) e **JetBrains Mono** (rótulos e números). Todas via Google Fonts.

## ⚠️ Antes de publicar

Três placeholders precisam ser trocados. Todos estão marcados com comentário
`<!-- TROCAR: ... -->` no `index.html`:

1. **WhatsApp** — 6 ocorrências de `https://wa.me/55XXXXXXXXXXX`.
   Troque tudo de uma vez:
   ```bash
   sed -i '' 's/55XXXXXXXXXXX/5511987654321/g' index.html
   ```
2. **Instagram** — `https://instagram.com/USUARIO` no rodapé.
3. **E-mail** — `contato@EXEMPLO.com` no rodapé.

## Sobre os números da página

O que está publicado e de onde veio:

| Número | Origem |
|---|---|
| 35,5M views · 303 vídeos · 117,2K de média | Print do analytics da `#poraiedit` no TikTok |
| 19.041.473 em "Por Aí" · 7,4M ouvintes | Print do perfil do DJ Topo no Spotify |
| 2.367.384 em "Quer Mídia" · 1M ouvintes | Print do perfil do Boschin no Spotify |
| 45,5K curtidas · 19,3K compartilhamentos | Print de um edit orgânico no TikTok |
| +21M streams · 8,4M ouvintes | Soma dos dois prints do Spotify |
| **+187M visualizações** | **Informado pela Sheper — o print da TEARSBR não estava no Drive.** Vale anexar o print antes de publicar, já que é o número mais forte da página. |
| +10 marcas e artistas | Contagem dos clientes citados no material |

## O que ainda falta de material

O Drive tinha pastas de briefing sem arquivo dentro. Se esse conteúdo aparecer, dá pra
enriquecer a página:

- **Fotos do Juan e do Sátiro** — hoje a seção "Quem somos" usa só a ilustração da
  ovelha negra. Com foto dos dois ela fica muito mais forte.
- **Print dos 187M views da TEARSBR** — ver tabela acima.
- **Abbot × LX — "O Plano"** e **audiovisual do Tiago** — pastas vazias; os dois
  aparecem hoje só como nome no marquee.
- **Logos dos clientes em PNG** — o marquee usa os nomes em tipografia. Com os logos
  reais fica mais próximo da referência.
- **Depoimentos de clientes** — não havia nenhum no material, então a seção não foi
  criada. Com 2 ou 3 depoimentos reais, o lugar natural é entre "Processo" e "Quem somos".
