<!-- js/mascot.js -->
(function () {
  function initMascot() {
    const container = document.getElementById('mascot-lottie');
    if (!container || !window.lottie) return;

    const anim = lottie.loadAnimation({
      container,
      renderer: 'svg',
      loop: true,
      autoplay: true,
      path: 'public/dog.json' // <- your animation JSON
    });

    // Remove PNG fallback once the vector anim is ready
    anim.addEventListener('DOMLoaded', () => {
      const fb = document.querySelector('.mascot__fallback');
      if (fb) fb.remove();
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initMascot);
  } else {
    initMascot();
  }
})();
