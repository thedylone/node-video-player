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
