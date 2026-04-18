const { v4: uuidv4 } = require('uuid');

const SKIP_CLASSES = new Set(['grid-item', 'grid-item--width2', 'grid-item--width4', 'me', 'bio']);

function getCategories($el) {
  return $el.attr('class').split(/\s+/).filter(c => !SKIP_CLASSES.has(c));
}

function parseImageItem($, $el) {
  const $a = $el.find('a[data-fancybox]');
  const categories = getCategories($el).filter(c => c !== 'video' && c !== 'three');
  return {
    id: uuidv4(),
    type: 'image',
    src: $a.attr('href') || '',
    thumb: $el.find('img').first().attr('src') || '',
    caption: $a.attr('data-caption') || '',
    fancyboxGroup: $a.attr('data-fancybox') || '',
    categories,
    order: 0,
  };
}

function parseVideoItem($, $el) {
  const $facade = $el.find('.yt-facade');
  return {
    id: uuidv4(),
    type: 'video',
    videoId: $facade.attr('data-vid') || '',
    caption: $facade.attr('data-caption') || '',
    categories: ['video'],
    order: 0,
  };
}

function parseThreeItem($, $el) {
  const src = $el.find('iframe').attr('src') || '';
  const label = src.replace('model/', '').replace('.html', '');
  return {
    id: uuidv4(),
    type: 'three',
    src,
    label,
    categories: ['three'],
    order: 0,
  };
}

module.exports = { parseImageItem, parseVideoItem, parseThreeItem };
