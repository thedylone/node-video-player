/**
 * retrieves selected filters and sets them to the url.
 */
function filterSource() {
    filter = [];
    $.each($('.sidebar__filter__list--item input:checked'), (index, input) => {
        filter.push($(input).attr('value'));
    });
    url = filter.length ? '/?filter=' + filter.join('&filter=') : '/';
    window.location.replace(url);
}

/**
 * sets the source of the video.
 * @param {string} title the title of the video.
 * @param {int} index the index of the video.
 */
function setSource(title, index) {
    const path = '/video?title=' + title + '&index=' + index;
    const video = $('.video-frame__video');
    if ($(video).attr('src') !== path) $(video).attr('src', path);
}
