'use strict';

// Function to convert rgb to hex
function rgbToHex(rgb) {
    var result = rgb.match(/^rgb\((\d+),\s*(\d+),\s*(\d+)\)$/);
    return "#" +
        ("0" + parseInt(result[1], 10).toString(16)).slice(-2) +
        ("0" + parseInt(result[2], 10).toString(16)).slice(-2) +
        ("0" + parseInt(result[3], 10).toString(16)).slice(-2);
}

function initCodemirror(el) {
    const editor = CodeMirror.fromTextArea(el, {
        model: {
            name: "javascript",
            json: true
        },
        lineNumbers: true,
        indentUnit: 4,
        autoCloseBrackets: true,
        matchBrackets: true
    });

    $(el).data('editor', editor);
}

async function jsonRequest(url, data = null, options = {}) {
    options.headers = {
        ...(options.headers || {}),
    }

    if (data) {
        options.method = 'POST';
        options.headers = {
            'Content-Type': 'application/json'
        };
        options.body = JSON.stringify(data)
    } else {
        options.method = 'GET';
    }
    
    const response = await fetch(url, options);
    if (!response.ok) {
        throw new Error(await response.text());
    }
    return response.json();
}

async function changeState(deviceId, featureId, value, onChangeCallback) {
    try {
        const result = await jsonRequest('/request-update', {
            deviceId,
            featureId,
            value
        })

        if (!result && updateCallbackId) {
            typeof onChangeCallback === 'function ' && await onChangeCallback(new Error('Unable to request state update'));
            return;
        }

        typeof onChangeCallback === 'function ' && await onChangeCallback(null, result);
    } catch (e) {
        console.error(e);
        toastr.error('Unable change feature state');
    }
}

async function refreshView(deviceId, featureId, schema) {
    try {
        const r = await jsonRequest(`/refresh?_=${Math.random()}&did=${deviceId}&fid=${featureId}`);
        if (!r.status) {
            return;
        }
        
        if (schema.type === 'color') {
            const value = r.state.pendingChange || r.state.value || r.state.schema.default;
            $(`#${deviceId}_${featureId}_container`).find('input.colorpicker')
                .data('stop-propagation', true)
                .minicolors('value', value);
            $(`#${deviceId}_${featureId}_container`).find('input.colorpicker')
                .data('stop-propagation', false);

        } else  if (schema.type === 'json') {
            let value = r.state.pendingChange || r.state.value || r.state.schema.default;
            const txtarea = $(`#${deviceId}_${featureId}_container`).find('textarea')
            if (typeof value === 'object') {
                value = JSON.stringify(value, null, 2);
            }
            if (txtarea.data('editor')) {
                txtarea.data('editor').setValue(value);
                txtarea.parent().find('button').removeAttr('disabled');
            }
        } else {
            $(`#${deviceId}_${featureId}_container`).replaceWith(r.content);    
        }

        $('body').find('input.colorpicker').each((i, el) => {
            if (!$(el).minicolors('settings')) {
               $(el).minicolors() 
            }
        });
        
        $('body').find('textarea[data-control-type="json"]').each((_, el) => {
            if (!$(el).data('editor')) {
                initCodemirror(el)
            }
        });
    } catch (e) {
        console.error(e);
    }
}

function describe(el) {
    return {
        did: el.data('did'),
        elId: el.prop('id'),
        featureId: el.data('fid')
    };
}

function addToList(caller, formId) {
    const formEl = $(`#${formId}`);
    const { did, featureId } = describe(formEl);
    
    const props = formEl.data('props').split(',');
    
    const item = {};
    
    const elements = [];
    
    for (const prop of props) {
        const el = $(`[data-prop="${prop}"]`);
        if (!el[0]) {
            continue;
        }
        
        const elTag = el.prop('tagName').toLowerCase();
        const elType = el.prop('type');
        
        let value;
        
        if (elTag === 'input' && elType === 'checkbox') {
            value = Number(el.is(':checked'));
        } else {
            value = el.val();
        }
        
        item[prop] = value;
        elements.push(el);
    };
    
    const value = {
        operation: 'add',
        value: item
    };
    
    elements.forEach((e) => e.prop('disabled', true));
    caller.prop('disabled', true);
    
    changeState(did, featureId, value);
}

function removeFromList(caller, listId) {
    const listEl = $(`#${listId}`);
    const itemId = caller.data('item-id');
    
    const { did, featureId } = describe(listEl);

    const addBtn = $(`#${caller.data('container-id')}`).find('button[data-operator="add"]');

    caller.attr('disabled', 'disabled');
    addBtn.attr('disabled', 'disabled');
    
    const value = {
        operation: 'delete',
        value: itemId
    };
    
    changeState(did, featureId, value);
}

function callAction(caller) {
    const { did, featureId } = describe(caller);
    // TODO: implement this
}

function setList(caller, listId) {
    const listEl = $(`#${listId}`);

    const { did, featureId } = describe(listEl);
    
    const values = listEl.val();
    
    caller.prop('disabled', true);
    listEl.prop('disabled', true);
    
    changeState(did, featureId, values);
}

function bindControls() {
    $.minicolors.defaults.control = 'wheel';
    $.minicolors.defaults.change = function (color) {
        const target = $(this);
        
        if (target.data('control-type') !== 'color') {
            return;
        }
        clearTimeout(target.data('timeout'));
        
        if (target.data('stop-propagation')) {
            target.data('stop-propagation', false);
            return;
        }
        
        target.data('timeout', setTimeout(() => {
            const nextState = color;
            
            const { did, featureId } = describe(target);
            changeState(did, featureId, nextState);
        }, 100));
    };
    
    $('body').on('click', 'input[type="checkbox"]', (e) => {
        const target = $(e.currentTarget);
        if (target.data('control-type') !== 'switch') {
            return;
        }

        e.preventDefault();
        e.stopPropagation();
        
        const nextState = Number(target.is(':checked'));
        target.prop('disabled', true);
        
        const { did, featureId } = describe(target);

        changeState(did, featureId, nextState);
    });
    


    $('body').on('click', 'button', (e) => {
        const target = $(e.currentTarget);
        
        if (target.data('role') === 'action') {
            e.preventDefault();
            e.stopPropagation();
            callAction(target);
        }
        
        if (target.data('operator') === 'set' && target.data('role') === 'list-control') {
            e.preventDefault();
            e.stopPropagation();
            setList(target, target.data('target'));
            return;
        }
        
        if (target.data('operator') === 'add' && target.data('role') === 'list-control') {
            e.preventDefault();
            e.stopPropagation();
            addToList(target, target.data('target'));
        }
    })
    
    $('body').on('click', 'a', (e) => {
        const target = $(e.currentTarget);
        
        if (target.attr('disabled')) {
            return;
        }
        
        if (target.data('operator') === 'delete' && target.data('role') === 'list-control') {
            e.preventDefault();
            e.stopPropagation();
            removeFromList(target, target.data('target'));
        }
    });
    
    $('body').find('input.colorpicker').each((i, el) => {
        $(el).minicolors();
    });
    
    $('body').on('click', 'button.colorpicker', (e) => {
        e.preventDefault();
        const target = $(e.currentTarget);
        if (!target.data('target')) {
            return;
        }
        const colorPickerElement = $(`#${target.data('target')}`);
        if (!colorPickerElement.minicolors('settings')) {
            return;
        }
        
        const color = rgbToHex(target.css('background-color'));
        colorPickerElement.minicolors('value', color)
    })
    
    $('body').find('textarea[data-control-type="json"]').each((_, el) => {
        initCodemirror(el)
    });

    $('body').on('click', 'button[data-save-btn="1"]', (e) => {
        e.preventDefault();
        const target = $(e.currentTarget);
        
        const targetFeature = target.data('target');
        if (!targetFeature) {
            console.warn("Missing target feature");
            return;
        }
        
        const targetElement = document.getElementById(targetFeature);
        if (!targetElement) {
            console.error("Target element not found!");
            return;
        }
        
        try {
            const value = $(targetElement).data('editor').getValue();
            try {
                JSON.parse(value);
            } catch (e) {
                toastr.error('Invalid JSON');
                return;
            }
            
            const { did, featureId } = describe($(targetElement));
            target.prop('disabled', true);
            
            changeState(did, featureId, value, (err, result) => {
                target.prop('disabled', false);
            });
        } catch (e) {
            console.error(e);
            return;
        }
    });

}

function delay(ms) {
    return new Promise((r) => {
        setTimeout(r, ms);
    })
}

async function startPolling() {
    const DELAY = 500;
    while (true) {
        let result;
        try {
            result = await jsonRequest(`/status?_=${Math.random()}`);
        } catch (e) {
            console.error(e);
            await delay(DELAY);
            continue;
        }
        
        for (const key in result.lastSeen) {
            $(`span#${key}-last-seen`).html(result.lastSeen[key]);
            
        }
        result = result.result
        
        for (const cbId in result) {
            const [deviceId, featureId] = cbId.split(':');
            const data = result[cbId];
            await refreshView(deviceId, featureId, data.schema);
        }
        await delay(DELAY);
    }
}

$(() => {
    bindControls();
    startPolling();
});
