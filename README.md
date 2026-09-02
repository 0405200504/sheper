# SHEPER — Landing page / portfólio

Página de vendas e portfólio da **Sheper**, agência criativa para marcas de streetwear
e artistas. Site estático: HTML, CSS e JavaScript puros, sem build. A única biblioteca
é o three.js, hospedado junto com o site e carregado só quando a abertura 3D vai rodar.

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
| `js/intro.js` | Abertura 3D: estúdio HDR gerado em runtime, marca extrudada em metal, montagem por estilhaços e pós-processamento (bloom, grão, vinheta) |
| `assets/vendor/` | three.js r185 (`three.module.js` + `three.core.min.js`), servido do próprio domínio |
| `assets/logo/mark-shape.json` | Contorno vetorial da ovelha, traçado a partir do PNG — é dele que sai a geometria 3D |
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

## Abertura 3D

Quem chega pela primeira vez cai numa portaria preta com um botão: **Abrir**.
O clique é o que abre a cena — e, de quebra, é o que destrava o áudio no
navegador, então o som entra junto com o primeiro estilhaço em vez de precisar ser
resgatado no meio. Daí vêm ~3,5s de abertura: estilhaços de metal giram no escuro, se
encaixam na ovelha da marca, a luz varre a peça e um estouro de luz entrega o hero.

Enquanto a portaria está no ar, o three.js carrega, o estúdio é montado e a geometria
é compilada. Quando o visitante clica, quase sempre já está tudo pronto — se não
estiver, a portaria mostra *preparando a cena* e parte sozinha assim que estiver.
Ou seja: o tempo de carga acontece atrás de uma tela que tem o que dizer.

Como funciona, em resumo:

- **Geometria de verdade.** O contorno da ovelha foi traçado do PNG para
  `assets/logo/mark-shape.json` e vira uma peça extrudada com bisel — por isso o
  brilho corre pela borda em vez de ser um decalque.
- **Iluminação de estúdio.** O HDRI é montado em código (float, com valores acima de 1)
  e passa pelo PMREM do three.js. Não há arquivo `.hdr` para baixar.
- **Montagem por estilhaço.** Cada triângulo carrega uma direção e um atraso próprios,
  aplicados no vertex shader. Nada de mil objetos: é uma malha só.
- **Pós-processamento próprio.** Bloom em duas passadas, tonemap ACES, aberração
  cromática, vinheta e grão — tudo em `js/intro.js`, sem os módulos de exemplo.
- **Som sintetizado.** Nada é baixado: sub grave que cresce, cacos metálicos
  adensando, o baque do encaixe com cauda inarmônica e um riser na entrega, tudo
  gerado em Web Audio e agendado a partir da mesma linha do tempo da animação.

### A portaria

- **Abrir** — entra com som, do primeiro frame.
- **Entrar em silêncio** — entra sem som, para quem está no escritório ou no ônibus.
- Ninguém fica preso numa tela preta: sem resposta por 15s **com a aba à vista**, a
  abertura entra sozinha, em silêncio. Aba escondida não conta — a pessoa está em
  outro lugar e perderia a cena.
- Gesto solto na portaria (rolar, deslizar, `Esc`) não dispara nada: os atalhos de
  pular só passam a valer quando a animação começa de fato.

### Som

O navegador só libera áudio depois de um gesto — por isso a portaria existe. O clique
destrava o contexto (com um buffer mudo de um sample, que é o que o Safari do iPhone
exige) e a trilha é agendada a partir do t=0 da animação.

Durante a abertura há ainda o botão de som no canto inferior esquerdo, para tirar ou
pôr no meio do caminho. Ligando no meio, a trilha entra no ponto em que a animação
está — o que já passou não toca de novo. A escolha fica no `localStorage`
(`sheper:som`).

### No celular

- A coreografia é a mesma, mas roda ~30% mais rápida (`RATE`), então a abertura dura
  cerca de 2,8s em vez de 3,6s.
- Perfil mais leve: metade da resolução nos mapas e no HDRI, sem verniz nem mapa de
  rugosidade (menos shader para compilar), sem MSAA, uma passada de bloom, menos
  poeira e `devicePixelRatio` limitado a 1,35.
- Se ainda assim os quadros vierem lentos, a abertura mede as primeiras dezenas de
  frames e **corta qualidade sozinha** — derruba resolução e bloom sem interromper
  a cena — em vez de deixar a animação arrastando.

### A entrega

O corte da abertura para a página é um estouro de luz que se dissipa em 0,75s. Duas
regras valem para não parecer que a página recarregou:

- **Quando a luz clareia, a página já tem que estar montada.** Nada de fundo entrando
  animado — se o mural do hero aparecer depois, a página surge preta e vai se montando,
  que é exatamente a cara de um reload. Só o texto do hero assenta, e dentro da própria
  clareada.
- **Nada que já tenha `transform` pode ser animado por `transform`.** O mural do hero
  tem `rotate(-4deg) scale(1.18)`; uma animação de entrada nele apagava os dois e o
  mural pulava 350px de largura, ida e volta.

**Quando ela não roda** (e a página abre direto, sem baixar nada da abertura):

- `prefers-reduced-motion: reduce`;
- segunda visita na mesma aba (`sessionStorage`);
- sem WebGL2, no modo de economia de dados ou em conexão 2G;
- se o three.js ou o JSON do contorno falharem — há um cronômetro de socorro que
  entrega a página em ~2,4s.

Com a animação rodando, o visitante pode pular a qualquer momento: botão **Pular**,
clique, `Esc`, espaço, scroll ou swipe. Os botões da interface não disparam o pulo.

**Para desligar de vez:** apague o bloco `<script>` da abertura no fim do `<head>` do
`index.html`. O resto da página não depende dele.

## Formulário

O envio só é dado como recebido depois de ler `ok:true` na resposta do Apps Script —
um envio que não dá para confirmar vira falha, porque é melhor a pessoa reenviar do
que sair achando que aplicou sem a linha ter chegado na planilha.

Para que um soluço de rede não passe por formulário quebrado, cada envio tem **duas
tentativas** (com 1,4s entre elas) e um limite de 15s por tentativa. Reenviar é
seguro: cada envio carrega um `id` e o Apps Script ignora um `id` que já gravou.

Quando falha de vez, a pessoa vê um recado curto e o console recebe o motivo exato
(`[sheper] envio não confirmado: …`) — é por ali que se descobre se o problema foi
rede, implantação sem acesso público (o Google devolve HTML de login em vez de JSON)
ou erro dentro do script.

Para conferir se a implantação está de pé, basta abrir a URL do `data-endpoint` no
navegador: tem que responder `{"ok":true,"servico":"sheper-formulario"}`.

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

> **O passo 5 é onde quase todo mundo tropeça.** Se "Quem pode acessar" ficar em
> "Somente eu" ou "Qualquer pessoa com Conta do Google", o endpoint responde com
> um redirecionamento para a tela de login do Google em vez de gravar, e nenhum
> visitante do site consegue enviar. Dá pra checar em um comando:
>
> ```bash
> curl -s -o /dev/null -D - "SUA_URL/exec" | grep -i "^location"
> ```
>
> Se aparecer um `location:` apontando para `accounts.google.com`, a permissão
> está errada. Quando estiver certa, esse comando não devolve nada.

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
- **Sucesso só quando confirmado.** O site só mostra "recebido" depois de ler
  `ok: true` na resposta do script. Envio que não dá pra confirmar aparece como
  falha, de propósito: é melhor a pessoa reenviar do que sair achando que aplicou
  quando a linha nunca chegou. Para o reenvio ser seguro, cada envio carrega um
  `id` próprio que o script confere antes de gravar, então tentar de novo nunca
  vira duas linhas da mesma pessoa.
- **Fila de escrita.** O script usa `LockService`, então dois envios simultâneos
  esperam a vez em vez de brigarem pela mesma linha.
