(function () {
  var brandBlastButton = document.getElementById('brand-blast');

  if (!brandBlastButton) {
    return;
  }

  function blastBirds() {
    if (typeof window.emojiBlast !== 'function') {
      return;
    }

    var rect = brandBlastButton.getBoundingClientRect();
    var centerX = rect.left + rect.width / 2;
    var centerY = rect.top + rect.height / 2;

    var offsets = [
      { x: 0, y: 0 },
      { x: -24, y: -10 },
      { x: 24, y: -10 },
    ];

    offsets.forEach(function (offset, index) {
      window.setTimeout(function () {
        window.emojiBlast({
          emojiCount: 28,
          emojis: ['🪶', '🐦‍⬛'],
          position: {
            x: centerX + offset.x,
            y: centerY + offset.y,
          },
          uniqueness: 2,
        });
      }, index * 90);
    });
  }

  brandBlastButton.addEventListener('click', blastBirds);
})();
