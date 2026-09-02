/* ==========================================================================
   SHEPER — comportamento da landing page
   Sem dependências. Tudo degrada bem se o JS não carregar.
   ========================================================================== */
(function () {
  'use strict';

  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var $  = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };

  /* ------------------------------------------------------------------ ano */
  var year = $('#year');
  if (year) year.textContent = new Date().getFullYear();

  /* --------------------------------------------------------- header fixo */
  var header = $('#header');
  var onScroll = function () {
    header.classList.toggle('is-stuck', window.scrollY > 24);
  };
  onScroll();
  window.addEventListener('scroll', onScroll, { passive: true });

  /* ----------------------------------------------------------- menu mobile */
  var burger = $('#burger');
  var drawer = $('#drawer');

  if (burger && drawer) {
    drawer.hidden = false;

    var setMenu = function (open) {
      burger.setAttribute('aria-expanded', String(open));
      burger.setAttribute('aria-label', open ? 'Fechar menu' : 'Abrir menu');
      drawer.classList.toggle('is-open', open);
      document.body.classList.toggle('is-locked', open);
    };

    burger.addEventListener('click', function () {
      setMenu(burger.getAttribute('aria-expanded') !== 'true');
    });

    $$('a', drawer).forEach(function (a) {
      a.addEventListener('click', function () { setMenu(false); });
    });

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && drawer.classList.contains('is-open')) setMenu(false);
    });
  }

  /* -------------------------------------------------------- reveal on scroll */
  var revealables = $$('[data-reveal]');

  if (reduce || !('IntersectionObserver' in window)) {
    revealables.forEach(function (el) { el.classList.add('is-in'); });
  } else {
    var revealObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-in');
        revealObserver.unobserve(entry.target);
      });
    }, { rootMargin: '0px 0px -12% 0px', threshold: 0.08 });

    revealables.forEach(function (el) { revealObserver.observe(el); });
  }

  /* ------------------------------------------------------ contadores animados */
  var counters = $$('[data-count]');

  var formatCount = function (value, decimals) {
    return value.toFixed(decimals).replace('.', ',');
  };

  var runCounter = function (el) {
    var target   = parseFloat(el.getAttribute('data-count'));
    var decimals = parseInt(el.getAttribute('data-decimals') || '0', 10);
    var prefix   = el.getAttribute('data-prefix') || '';
    var suffix   = el.getAttribute('data-suffix') || '';
    var duration = 1300;
    var start    = null;

    var tick = function (now) {
      if (start === null) start = now;
      var p = Math.min((now - start) / duration, 1);
      var eased = 1 - Math.pow(1 - p, 3);
      el.textContent = prefix + formatCount(target * eased, decimals) + suffix;
      if (p < 1) requestAnimationFrame(tick);
    };

    requestAnimationFrame(tick);
  };

  if (!reduce && 'IntersectionObserver' in window) {
    var countObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        runCounter(entry.target);
        countObserver.unobserve(entry.target);
      });
    }, { threshold: 0.6 });

    counters.forEach(function (el) { countObserver.observe(el); });
  }

  /* ------------------------------------------------------- carrossel de cases */
  var rail = $('#caseRail');

  if (rail) {
    var cards = $$('.case', rail);
    var dots  = $('#railDots');
    var prev  = $('#railPrev');
    var next  = $('#railNext');

    cards.forEach(function (card, i) {
      var dot = document.createElement('button');
      dot.type = 'button';
      dot.setAttribute('role', 'tab');
      dot.setAttribute('aria-label', 'Ir para o case ' + (i + 1));
      dot.addEventListener('click', function () {
        rail.scrollTo({ left: card.offsetLeft - rail.offsetLeft, behavior: reduce ? 'auto' : 'smooth' });
      });
      dots.appendChild(dot);
    });

    var dotEls = $$('button', dots);

    var activeIndex = function () {
      var mid = rail.scrollLeft + rail.clientWidth / 2;
      var best = 0;
      var bestDist = Infinity;
      cards.forEach(function (card, i) {
        var center = card.offsetLeft - rail.offsetLeft + card.offsetWidth / 2;
        var dist = Math.abs(center - mid);
        if (dist < bestDist) { bestDist = dist; best = i; }
      });
      return best;
    };

    var syncRail = function () {
      var i = activeIndex();
      dotEls.forEach(function (d, n) {
        d.classList.toggle('is-active', n === i);
        d.setAttribute('aria-selected', String(n === i));
      });
      prev.disabled = rail.scrollLeft <= 2;
      next.disabled = rail.scrollLeft >= rail.scrollWidth - rail.clientWidth - 2;
    };

    var step = function (dir) {
      var card = cards[0];
      var gap = parseFloat(getComputedStyle(rail).columnGap || '16') || 16;
      rail.scrollBy({ left: dir * (card.offsetWidth + gap), behavior: reduce ? 'auto' : 'smooth' });
    };

    prev.addEventListener('click', function () { step(-1); });
    next.addEventListener('click', function () { step(1); });

    var railTimer;
    rail.addEventListener('scroll', function () {
      clearTimeout(railTimer);
      railTimer = setTimeout(syncRail, 60);
    }, { passive: true });

    window.addEventListener('resize', syncRail);
    syncRail();
  }

  /* --------------------------------------------- vídeos verticais (autoplay) */
  var videos = $$('[data-video] video');

  var play = function (video) {
    if (reduce) return;
    var attempt = video.play();
    if (attempt && attempt.catch) attempt.catch(function () { /* autoplay bloqueado */ });
  };

  /* O vídeo troca de lugar com o poster assim que tem o primeiro quadro. */
  var reveal = function (video) { video.classList.add('is-playing'); };

  videos.forEach(function (video) {
    if (video.readyState >= 2) reveal(video);
    else video.addEventListener('loadeddata', function () { reveal(video); });
    play(video);
  });

  if (videos.length) {
    /* Os quatro rodam em loop o tempo todo — nada pausa ao sair da viewport.
       Só retomamos depois de a aba voltar do segundo plano, ou no primeiro
       toque, para o caso de o navegador ter barrado o autoplay. */
    var playAll = function () { videos.forEach(play); };

    document.addEventListener('visibilitychange', function () {
      if (!document.hidden) playAll();
    });

    ['pointerdown', 'touchstart', 'keydown'].forEach(function (evt) {
      window.addEventListener(evt, playAll, { once: true, passive: true });
    });
  }

  /* -------------------------------------------------------------- formulário */
  var form = $('#leadForm');

  if (form) {
    var statusEl = $('#formStatus');
    var submitBtn = $('#formSubmit');
    var submitLabel = $('.form__label', submitBtn);
    var endpoint = (form.getAttribute('data-endpoint') || '').trim();
    var configurado = endpoint && endpoint.indexOf('COLE_') !== 0;

    var setStatus = function (tipo, texto) {
      statusEl.className = 'form__status is-on ' + (tipo === 'ok' ? 'is-ok' : 'is-err');
      statusEl.textContent = texto;
    };

    var travar = function (travado, texto) {
      submitBtn.disabled = travado;
      submitLabel.textContent = texto;
    };

    form.addEventListener('submit', function (e) {
      e.preventDefault();

      if (!form.reportValidity()) return;

      if (!configurado) {
        setStatus('err', 'O formulário ainda não foi ligado à planilha. Quem cuida do site precisa colar a URL do Apps Script em data-endpoint (o passo a passo está no README).');
        return;
      }

      var dados = {};
      new FormData(form).forEach(function (valor, chave) { dados[chave] = valor; });

      /* id próprio: se a resposta se perder no caminho e o envio for repetido,
         o Apps Script reconhece e não grava a mesma pessoa duas vezes. */
      dados.id = Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
      dados.pagina = location.href;

      var corpo = JSON.stringify(dados);

      travar(true, 'Enviando');
      statusEl.className = 'form__status';

      /* Só damos "recebido" depois de ler ok:true na resposta. Um envio que a
         gente não consegue confirmar é tratado como falha: é melhor a pessoa
         reenviar (o id acima impede linha duplicada) do que sair achando que
         aplicou quando a linha nunca chegou na planilha. */
      fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: corpo
      })
        .then(function (resposta) { return resposta.json(); })
        .then(function (resultado) {
          if (!resultado || resultado.ok !== true) throw new Error('resposta inesperada');
          travar(false, 'Enviar aplicação');
          form.reset();
          setStatus('ok', 'Recebido. A gente lê e responde em até 24h úteis, no e-mail e no WhatsApp que você deixou.');
        })
        .catch(function () {
          travar(false, 'Enviar aplicação');
          setStatus('err', 'Não conseguimos enviar agora. Tenta de novo em instantes ou chama a gente no Instagram.');
        });
    });
  }

  /* --------------------------------------------------------------- lightbox */
  var gallery = $('#gallery');
  var lb      = $('#lightbox');

  if (gallery && lb) {
    lb.hidden = false;

    var figures = $$('figure', gallery);
    var lbImg   = $('#lbImg');
    var lbCap   = $('#lbCap');
    var current = 0;
    var lastFocus = null;

    var show = function (i) {
      current = (i + figures.length) % figures.length;
      var img = $('img', figures[current]);
      var cap = $('figcaption', figures[current]);
      lbImg.src = img.currentSrc || img.src;
      lbImg.alt = img.alt;
      lbCap.textContent = (cap ? cap.textContent + ' · ' : '') + (current + 1) + ' / ' + figures.length;
    };

    var openLb = function (i) {
      lastFocus = document.activeElement;
      show(i);
      lb.classList.add('is-open');
      document.body.classList.add('is-locked');
      $('#lbClose').focus();
    };

    var closeLb = function () {
      lb.classList.remove('is-open');
      document.body.classList.remove('is-locked');
      lbImg.src = '';
      if (lastFocus) lastFocus.focus();
    };

    figures.forEach(function (fig, i) {
      fig.setAttribute('tabindex', '0');
      fig.setAttribute('role', 'button');
      fig.setAttribute('aria-label', 'Ampliar imagem ' + (i + 1));
      fig.addEventListener('click', function () { openLb(i); });
      fig.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openLb(i); }
      });
    });

    $('#lbClose').addEventListener('click', closeLb);
    $('#lbPrev').addEventListener('click', function () { show(current - 1); });
    $('#lbNext').addEventListener('click', function () { show(current + 1); });

    lb.addEventListener('click', function (e) {
      if (e.target === lb) closeLb();
    });

    document.addEventListener('keydown', function (e) {
      if (!lb.classList.contains('is-open')) return;
      if (e.key === 'Escape') closeLb();
      if (e.key === 'ArrowLeft') show(current - 1);
      if (e.key === 'ArrowRight') show(current + 1);
    });
  }
})();
