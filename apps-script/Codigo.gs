/**
 * SHEPER — recebe o formulário do site e grava uma linha na planilha.
 *
 * Como instalar (leva uns 5 minutos):
 *
 *  1. Crie uma planilha nova no Google Sheets.
 *  2. Nela, vá em Extensões > Apps Script.
 *  3. Apague o conteúdo do arquivo que abrir e cole este arquivo inteiro.
 *  4. Se quiser receber aviso por e-mail a cada aplicação, preencha AVISAR_EM
 *     logo abaixo. Deixe as aspas vazias para não receber nada.
 *  5. Clique em Implantar > Nova implantação > tipo Aplicativo da Web.
 *       Executar como .......... Eu
 *       Quem pode acessar ...... Qualquer pessoa
 *  6. Autorize quando o Google pedir e copie a URL que termina em /exec.
 *  7. No index.html, cole essa URL no atributo data-endpoint do <form>.
 *
 * Sempre que mudar este código, é preciso implantar de novo (Implantar >
 * Gerenciar implantações > editar > Nova versão). Só salvar não publica.
 */

/** Deixe vazio para não receber aviso por e-mail. */
var AVISAR_EM = '';

/** Nome da aba onde as aplicações são gravadas. Criada sozinha se não existir. */
var ABA = 'Aplicações';

var COLUNAS = [
  ['recebidoEm',   'Recebido em'],
  ['nome',         'Nome'],
  ['marca',        'Marca ou artista'],
  ['email',        'E-mail'],
  ['whatsapp',     'WhatsApp'],
  ['link',         'Instagram ou site'],
  ['servico',      'O que precisa'],
  ['prazo',        'Quando quer começar'],
  ['investimento', 'Investimento mensal'],
  ['contexto',     'Contexto'],
  ['pagina',       'Página de origem'],
  ['id',           'ID do envio']
];

function doPost(e) {
  var trava = LockService.getScriptLock();

  try {
    // Envios simultâneos esperam a vez, para não escreverem na mesma linha.
    trava.waitLock(20000);

    var dados = JSON.parse(e.postData.contents);

    // Armadilha de bot: o campo fica escondido no site, humano nunca preenche.
    // Respondemos ok para o robô não perceber que foi barrado.
    if (dados.empresa) return responder({ ok: true });

    var aba = obterAba();
    prepararCabecalho(aba);

    // O site reenvia quando não consegue ler a resposta. O id evita duplicata.
    if (dados.id && jaGravado(aba, dados.id)) return responder({ ok: true, repetido: true });

    dados.recebidoEm = new Date();

    var linha = COLUNAS.map(function (coluna) {
      var valor = dados[coluna[0]];
      return valor === undefined || valor === null ? '' : valor;
    });

    aba.appendRow(linha);
    avisar(dados);

    return responder({ ok: true });

  } catch (erro) {
    console.error(erro);
    return responder({ ok: false, erro: String(erro) });

  } finally {
    try { trava.releaseLock(); } catch (ignorado) {}
  }
}

/** Só para conferir no navegador se a implantação está de pé. */
function doGet() {
  return responder({ ok: true, servico: 'sheper-formulario' });
}

function obterAba() {
  var planilha = SpreadsheetApp.getActiveSpreadsheet();
  return planilha.getSheetByName(ABA) || planilha.insertSheet(ABA);
}

function prepararCabecalho(aba) {
  if (aba.getLastRow() > 0) return;

  var titulos = COLUNAS.map(function (coluna) { return coluna[1]; });
  aba.appendRow(titulos);
  aba.getRange(1, 1, 1, titulos.length).setFontWeight('bold');
  aba.setFrozenRows(1);
  aba.setColumnWidth(COLUNAS.length, 130);
}

function jaGravado(aba, id) {
  var linhas = aba.getLastRow() - 1;
  if (linhas < 1) return false;

  var coluna = COLUNAS.length; // o id é a última coluna
  var existentes = aba.getRange(2, coluna, linhas, 1).getValues();

  for (var i = 0; i < existentes.length; i++) {
    if (String(existentes[i][0]) === String(id)) return true;
  }
  return false;
}

function avisar(dados) {
  if (!AVISAR_EM) return;

  var corpo = COLUNAS
    .filter(function (coluna) { return coluna[0] !== 'id' && coluna[0] !== 'recebidoEm'; })
    .map(function (coluna) { return coluna[1] + ': ' + (dados[coluna[0]] || ''); })
    .join('\n');

  MailApp.sendEmail({
    to: AVISAR_EM,
    subject: 'Nova aplicação: ' + (dados.marca || dados.nome || 'sem nome'),
    body: corpo + '\n\n' + SpreadsheetApp.getActiveSpreadsheet().getUrl()
  });
}

function responder(objeto) {
  return ContentService
    .createTextOutput(JSON.stringify(objeto))
    .setMimeType(ContentService.MimeType.JSON);
}
