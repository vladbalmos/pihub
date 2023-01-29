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
    // Ajax, change state (set pendingChange = 1 on state)
    // Store elId on server memory and when received new state for the device, assign the change to elId
    // and on next refresh request, return only changed elements then execute callback assigned to elId
    
    const updateCallbackId = `${deviceId}:${featureId}`;
    updateCallbacks[updateCallbackId] = onChangeCallback;
    
    try {
        const result = await jsonRequest('/request-update', {
            deviceId,
            featureId,
            value
        })

        if (!result) {
            delete updateCallbacks[updateCallbackId];
            onChangeCallback(new Error('Unable to request state update'));
        }
    } catch (e) {
        console.error(e);
        toastr.error('Unable change feature state');
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
    
    changeState(did, featureId, value, async (err) => {
        elements.forEach((e) => e.prop('disabled', false));
        caller.prop('disabled', false);

        if (err) {
            return;
        }

        try {
            const r = await jsonRequest(`/refresh?_=${Math.random()}&did=${did}&fid=${featureId}`);
            if (!r.status) {
                return;
            }
            
            $(`#${did}_${featureId}_container`).replaceWith(r.content);
        } catch (e) {
            console.error(e);
        }
    });
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
    
    changeState(did, featureId, value, (err) => {
        caller.removeAttr('disabled');
        addBtn.removeAttr('disabled', 'disabled');
        
        if (!err) {
            listEl.find(`li[data-id="${itemId}"]`).remove();
        }
    })
}

function setList(caller, listId) {
    const listEl = $(`#${listId}`);

    const { did, featureId } = describe(listEl);
    
    const values = listEl.val();
    
    caller.prop('disabled', true);
    listEl.prop('disabled', true);
    
    changeState(did, featureId, values, () => {
        caller.prop('disabled', false);
        listEl.prop('disabled', false);
    })
}

function bindControls() {
    
    $('body').on('click', 'input[type="checkbox"]', (e) => {
        const target = $(e.currentTarget);
        if (target.data('control-type') !== 'switch') {
            return;
        }

        e.preventDefault();
        e.stopPropagation();
        
        const nextState = Number(target.is(':checked'));
        target.prop('disabled', true);
        
        const { did, featureId, elId } = describe(target);

        changeState(did, featureId, nextState, (err) => {
            target.prop('disabled', false);
            
            if (!err) {
                target.prop('checked', Boolean(nextState));
            }
        })
    });
    


    $('body').on('click', 'button', (e) => {
        const target = $(e.currentTarget);
        
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
        
        result = result.result
        
        for (const cbId in result) {
            const status = result[cbId];
            
            if (status === 'completed' && typeof updateCallbacks[cbId] === 'function') {
                try {
                    await updateCallbacks[cbId]();
                } catch (e) {
                    console.error(e);
                }
            }
        }
        await delay(DELAY);
    }
}

$(() => {
    bindControls();
    startPolling();
});
