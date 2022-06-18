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
 * on success, show success modal and redirect to index after 3 seconds.
 * @param {string} title the title of the video.
 */
function deleteTitle(title) {
    $.post('/delete', {title: title}, (data) => {
        showModal({
            title: 'success',
            text: 'video deleted. redirecting back to index in 3 seconds...',
            showCancel: false,
            showConfirm: false,
        });
        setTimeout(() => window.location.replace('/'), 3000);
    });
}

/**
 * display a modal with information.
 * @param {Object} data the information to display in the modal.
 * @param {string} data.title the title of the modal.
 * @param {string} data.text the text to display in the modal.
 * @param {boolean} data.showCancel whether to show the cancel button.
 * @param {function} data.cancel cancel button onclick function.
 * @param {Object} data.cancelParams the params to pass to data.cancel.
 * @param {boolean} data.showConfirm whether to show the confirm button.
 * @param {function} data.confirm confirm button onclick function.
 * @param {Object} data.confirmParams the params to pass to data.confirm.
 */
function showModal(data) {
    const modal = $('.modal-wrapper');
    const title = $('.modal-content__title--text');
    const text = $('.modal-content__text--text');
    const cancel = $('.modal-content__button--cancel');
    const confirm = $('.modal-content__button--confirm');
    const defaults = {
        title: 'alert',
        text: '',
        showCancel: true,
        cancel: hideModal,
        cancelParams: {},
        showConfirm: true,
        confirm: hideModal,
        confirmParams: {},
    };
    const params = {...defaults, ...data};
    $(modal).css('display', 'flex');
    title.text(params.title);
    text.text(params.text);
    params.showCancel ? cancel.show() : cancel.hide();
    cancel.click(params.cancelParams, params.cancel);
    params.showConfirm ? confirm.show() : confirm.hide();
    confirm.click(params.confirmParams, params.confirm);
}

/**
 * hides the modal.
 */
function hideModal() {
    const modal = $('.modal-wrapper');
    $(modal).css('display', 'none');
}

/**
 * hides the modal on clicking outside the content.
 * @param {*} e the event object.
 */
window.onclick = (e) => {
    const modal = $('.modal-wrapper');
    if (e.target === modal[0]) {
        hideModal();
    }
};

/**
 * deleteTitle function with event handler.
 * @param {Object} e the event object.
 * @param {string} e.data.title the title of the video.
 */
function deleteTitleHandler(e) {
    deleteTitle(e.data.title);
}

/**
 * assign the showModal function to the deleter button.
 * @param {string} title the title of the video.
 */
function deleterOnclick(title) {
    showModal({
        title: 'delete',
        text: 'are you sure you want to delete this video?',
        confirm: deleteTitleHandler,
        confirmParams: {title: title},
    });
}

/**
 * pushes all tags values into a list and POST it to the server.
 * @param {string} title the title of the video.
 */
function updateTags(title) {
    const tags = [];
    $.each($('.sidebar__tagdisplay--tag'), (index, tag) => {
        tags.push($.trim($(tag).text()));
    });
    console.log(tags);
    $.post('/tags', {title: title, tags: tags.sort()}, (data) => {
        console.log(data);
    });
}

/**
 * create an empty tag and append it to the tagdisplay.
 * @param {string} title the title of the video.
 */
function createTag(title) {
    const button = $(`<button class="sidebar__tagdisplay--button">
    <span class="sidebar__tagdisplay--tag" contenteditable="true"
    onblur=updateTags('${title}')>
    </span>
    <span class="sidebar__tagdisplay--deleter"
    onclick=removeTag($(this).parent(),'${title}')>
    &times
    </span>
    </button>`);
    button.appendTo($('.sidebar__tagdisplay'));
}

/**
 * removes the specified button from the tagdisplay.
 * updates the tags on the server.
 * @param {button} tag the button for the tag to delete.
 * @param {string} title the title of the video.
 */
function removeTag(tag, title) {
    $(tag).remove();
    updateTags(title);
}
