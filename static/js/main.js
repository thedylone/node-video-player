/* eslint-disable no-unused-vars */
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

/**
 * sends a POST request to add title's counter by specified number.
 * @param {string} title the title of the video.
 * @param {int} num the number to add to the counter.
 */
function addCounter(title, num) {
    $.post('/count', {title: title, num: num}, (data) => {
        $('.sidebar__counter').text(`count: ${data}`);
    });
};

/**
 * sends a POST request to delete the title from storage.
 * redirects back to index after success.
 * @param {string} title the title of the video.
 */
function deleteTitle(title) {
    $.post('/delete', {title: title}, (data) => {
        window.location.replace('/');
    });
}
