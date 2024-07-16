'use strict';

const updateCallbacks = {};

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
    let updateCallbackId
    if (typeof onChangeCallback !== 'undefined') {
        updateCallbackId = `${deviceId}:${featureId}`;
        updateCallbacks[updateCallbackId] = onChangeCallback;
    }
    
    try {
        const result = await jsonRequest('/request-update', {
            deviceId,
            featureId,
            value
        })

        if (!result && updateCallbackId) {
            delete updateCallbacks[updateCallbackId];
            // onChangeCallback(new Error('Unable to request state update'));
        }

        // onChangeCallback(null, result);
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

        if (schema.type !== 'color') {
            $(`#${deviceId}_${featureId}_container`).replaceWith(r.content);
        } else {
            // $(`#${deviceId}_${featureId}_container`).find('input.colorpicker').minicolors('value', r.state.pendingChange || r.state.state || r.state.schema.default);
        }

        $('body').find('input.colorpicker').each((i, el) => {
            if (!$(el).minicolors('settings')) {
               $(el).minicolors() 
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
    // $.minicolors.defaults.control = 'brightness';
    $.minicolors.defaults.control = 'wheel';
    $.minicolors.defaults.theme = 'bootstrap';
    $.minicolors.defaults.change = function (color, opacity) {
        const target = $(this);
        
        if (target.data('control-type') !== 'color') {
            return;
        }
        
        clearTimeout(target.data('timeout'));
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
}

function delay(ms) {
    return new Promise((r) => {
        setTimeout(r, ms);
    })
}

async function startPolling() {
    const DELAY = 100;
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
