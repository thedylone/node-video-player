/* eslint-disable no-unused-vars */
/**
 * toggle sidebar visibility.
 */
function toggleSidebar() {
    const sidebar = $('.sidebar');
    if (sidebar.css('margin-right') != '0px') {
        sidebar.css('width', 'var(--sidebar-width-l)');
        sidebar.css('margin-right', '0px');
    } else {
        sidebar.css('width', '');
        sidebar.css('margin-right', '');
    }
}

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
 * retrieve id param from url
 * @return {string} the id from the url if exists, else null
 */
function retrieveId() {
    const params = new URLSearchParams(window.location.search);
    if (params.has('id')) {
        return params.get('id');
    } else {
        return null;
    }
}

/**
 * sets the source of the video.
 * @param {int} index the index of the video.
 */
function setSource(index) {
    const id = retrieveId();
    const path = encodeURI('/video?id=' + id + '&index=' + index);
    const video = $('.video-frame__video');
    if ($(video).attr('src') !== path) {
        $(video).attr('src', path);
        showAlert({title: 'source changed'});
    }
}

/**
 * sends a POST request to add title's counter by specified number.
 * @param {int} num the number to add to the counter.
 */
function addCounter(num) {
    const id = retrieveId();
    $.post('/count', {id: id, num: num})
        .done((data) => {
            $('.sidebar__counter').text(`count: ${data}`);
            showAlert({title: 'counter changed', mood: 'positive'});
        })
        .fail((xhr, status, error) => {
            showAlert({
                title: 'failed to changed counter',
                text: status,
                mood: 'negative',
            });
        });
};

/**
 * sends a POST request to delete the title from storage.
 * on success, show success modal and redirect to index after 3 seconds.
 */
function deleteTitle() {
    const id = retrieveId();
    $.post('/delete', {id: id}, (data) => {
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
 * display an alert popup with information.
 * alert popup will show for 3 seconds.
 * @param {Object} data the information to display in the alert.
 * @param {string} data.title the title of the alert.
 * @param {string} data.text the text of the alert.
 * @param {('neutral' | 'positive' | 'negative')} data.mood the colour to show.
 */
function showAlert(data) {
    const defaults = {
        title: 'alert',
        text: '',
        mood: 'neutral',
    };
    const params = {...defaults, ...data};
    const alertWrapper = $('.alert-wrapper');
    const alert = $(`<div class="alert-content alert-content--${params.mood}">
    <div class="alert-content__title">
        <span class="alert-content__title--text">${params.title}</span>
    </div>
    <div class="alert-content__text">
        <span class="alert-content__text--text">${params.text}</span>
    </div>
    </div>`);
    alert.appendTo(alertWrapper);
    setTimeout(() => {
        alert.fadeOut('slow', () => {
            alert.remove();
        });
    }, 3000);
}

/**
 * assign the showModal function to the deleter button.
 */
function deleterOnclick() {
    showModal({
        title: 'delete',
        text: 'are you sure you want to delete this video?',
        confirm: deleteTitle,
    });
}

/**
 * pushes all tags values into a list and POST it to the server.
 */
function updateTags() {
    const id = retrieveId();
    const tags = [];
    $.each($('.sidebar__tagdisplay--tag'), (index, tag) => {
        tags.push($.trim($(tag).text()));
    });
    // console.log(tags);
    $.post('/tags', {id: id, tags: tags.sort()})
        .done((data) => {
            showAlert({title: 'tags updated', mood: 'positive'});
        })
        .fail((xhr, status, error) => {
            showAlert({
                title: 'failed to update tags',
                text: error,
                mood: 'negative',
            });
        });
}

/**
 * create an empty tag and append it to the tagdisplay.
 */
function createTag() {
    const button = $(`<button class="sidebar__tagdisplay--button">
    <span class="sidebar__tagdisplay--tag" contenteditable="true"
    onblur=updateTags()>
    </span>
    <span class="sidebar__tagdisplay--deleter"
    onclick=removeTag($(this).parent())>
    &times
    </span>
    </button>`);
    button.appendTo($('.sidebar__tagdisplay'));
}

/**
 * removes the specified button from the tagdisplay.
 * updates the tags on the server.
 * @param {button} tag the button for the tag to delete.
 */
function removeTag(tag) {
    $(tag).remove();
    updateTags();
}

let showPreviewTimeout;
let stopPreviewTimeout;

/**
 * after hovering over for 1 second,
 * sets the source of the video to preview for 10 seconds.
 * @param {video} video the video element.
 */
function showPreview(video) {
    showPreviewTimeout = setTimeout(() => {
        const path = '/video?id=' + $(video).data('path') + '&index=0';
        $(video).attr('src', path);
        $(video).prop('controls', true);
        $(video).trigger('play').on('error', () => { });
        stopPreviewTimeout = setTimeout(() => {
            if ($(video).attr('src')) stopPreview(video);
        }, 10000);
    }, 1000);
}

/**
 * stops the video preview.
 * @param {video} video the video element.
 */
function stopPreview(video) {
    clearTimeout(showPreviewTimeout);
    clearTimeout(stopPreviewTimeout);
    // $(video).removeAttr('src');
    $(video).attr('src', '');
    $(video).prop('controls', false);
    $(video).prop('currentTime', 0);
    $(video).trigger('pause').on('error', () => { });
}
