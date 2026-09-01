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
| `assets/img/` | 35 fotos otimizadas (máx. 1500px, JPEG progressivo) + `fundadores.png`, o recorte do Juan e do Satiro com contorno de adesivo e fundo transparente |
| `assets/video/` | 4 vídeos verticais comprimidos (360×640) + posters |
| `apps-script/Codigo.gs` | Código que recebe o formulário e grava na planilha do Google |
| `vercel.json` | Cache dos assets e headers básicos |

## Design

Monocromático — preto `#0A0A0A` e off-white `#F4F2EE` — puxado do próprio logo da
ovelha negra. As seções alternam entre as duas temperaturas: a classe `.invert` troca
todos os tokens de cor de uma vez, então "Números" e o CTA final saem claros sem
nenhuma regra duplicada.

Tipografia: **Archivo** (display), **Inter** (texto), **Caveat** (assinatura
manuscrita das seções) e **JetBrains Mono** (rótulos e números). Todas via Google Fonts.

## ⚠️ Antes de publicar

### 1. Ligar o formulário à planilha (obrigatório)

O formulário só grava depois que você criar a planilha e publicar o script. Leva
uns 5 minutos e não custa nada:

1. Crie uma planilha nova no Google Sheets.
2. Nela, vá em **Extensões > Apps Script**.
3. Apague o que estiver lá e cole o conteúdo de `apps-script/Codigo.gs`.
4. Se quiser aviso por e-mail a cada aplicação, preencha `AVISAR_EM` no topo do
   arquivo. Deixe vazio para não receber nada.
5. **Implantar > Nova implantação > Aplicativo da Web**, com:
   - Executar como: **Eu**
   - Quem pode acessar: **Qualquer pessoa**
6. Autorize quando o Google pedir e copie a URL que termina em `/exec`.
7. No `index.html`, cole essa URL no `data-endpoint` do `<form id="leadForm">`.

Para conferir se ficou de pé, abra a URL `/exec` no navegador: deve responder
`{"ok":true,"servico":"sheper-formulario"}`.

Enquanto o `data-endpoint` estiver com o texto `COLE_A_URL_DO_APPS_SCRIPT_AQUI`,
quem enviar o formulário vê uma mensagem avisando que ele ainda não está ligado,
em vez de um falso "recebido".

Se um dia mudar o `Codigo.gs`, é preciso implantar de novo (**Implantar >
Gerenciar implantações > editar > Nova versão**). Só salvar não publica.

### 2. Trocar os dois placeholders do rodapé

Ambos marcados com `<!-- TROCAR: ... -->` no `index.html`:

- **Instagram**: `https://instagram.com/USUARIO`
- **E-mail**: `contato@EXEMPLO.com`

## Sobre os números da página

O que está publicado e de onde veio:

| Número | Origem |
|---|---|
| 35,5M views · 303 vídeos · 117,2K de média | Print do analytics da `#poraiedit` no TikTok |
| 19.041.473 em "Por Aí" · 7,4M ouvintes | Print do perfil do DJ Topo no Spotify |
| 2.367.384 em "Quer Mídia" · 1M ouvintes | Print do perfil do Boschin no Spotify |
| 1M de curtidas · 45,5K salvos · 19,3K compartilhamentos | Print de um edit orgânico no TikTok |
| +21M streams · 8,4M ouvintes | Soma dos dois prints do Spotify |
| **+187M visualizações** | **Informado pela Sheper — o print da TEARSBR não estava no Drive.** Vale anexar o print antes de publicar, já que é o número mais forte da página. |
| +10 marcas e artistas | Contagem dos clientes citados no material |

## O que ainda falta de material

O Drive tinha pastas de briefing sem arquivo dentro. Se esse conteúdo aparecer, dá pra
enriquecer a página:

- **Print dos 187M views da TEARSBR** — ver tabela acima.
- **Abbot × LX — "O Plano"** e **audiovisual do Tiago** — pastas vazias; os dois
  aparecem hoje só como nome no marquee.
- **Logos dos clientes em PNG** — o marquee usa os nomes em tipografia. Com os logos
  reais fica mais próximo da referência.
- **Depoimentos de clientes** — não havia nenhum no material, então a seção não foi
  criada. Com 2 ou 3 depoimentos reais, o lugar natural é entre "Processo" e "Quem somos".

## Carregamento

Nenhuma imagem usa `loading="lazy"` e os quatro vídeos vêm com `preload="auto"` e
`autoplay`: tudo é baixado assim que a página abre, sem pop-in durante o scroll. Em
troca, a primeira carga puxa cerca de 30MB — se um dia isso pesar demais em 4G, o
caminho é devolver o `loading="lazy"` só para a galeria, que é a parte mais pesada e
a que fica mais embaixo na página.

Os vídeos aparecem no lugar do poster assim que têm o primeiro quadro (`loadeddata`),
não quando entram na viewport. O IntersectionObserver só dá play e pause, para não
deixar quatro vídeos rodando fora da tela.

## Como o formulário se comporta

Nove perguntas, das quais oito são obrigatórias. As três de múltipla escolha
(o que precisa, quando quer começar, investimento previsto) existem para
qualificar antes da primeira conversa, e não para filtrar por preço: a legenda
abaixo do campo de investimento diz isso em voz alta, porque perguntar orçamento
sem explicar por quê espanta bom lead.

Três detalhes de implementação que valem saber:

- **Armadilha de bot.** Existe um campo `empresa` escondido por CSS. Humano nunca
  vê nem preenche; robô preenche tudo. Se vier preenchido, o script responde
  "ok" e descarta em silêncio, para o robô não perceber que foi barrado.
- **Reenvio sem duplicar.** O Apps Script às vezes grava a linha mas bloqueia a
  leitura da resposta por CORS. Quando isso acontece o site reenvia sem ler a
  resposta, e cada envio carrega um `id` próprio que o script confere antes de
  gravar. Assim o reenvio nunca vira duas linhas da mesma pessoa.
- **Fila de escrita.** O script usa `LockService`, então dois envios simultâneos
  esperam a vez em vez de brigarem pela mesma linha.
