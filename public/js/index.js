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
    
    try {
        const response = await fetch(url, options);
        return response.json();
    } catch (e) {
        console.error(e);
        toastr.error('Unable change feature state');
    }
}

async function changeState(deviceId, featureId, value, onChangeCallback) {
    // Ajax, change state (set pendingChange = 1 on state)
    // Store elId on server memory and when received new state for the device, assign the change to elId
    // and on next refresh request, return only changed elements then execute callback assigned to elId
    
    const updateCallbackId = `${deviceId}_${featureId}`;
    updateCallbacks[updateCallbackId] = onChangeCallback;
    
    const result = await jsonRequest('/request-update', {
        deviceId,
        featureId,
        value
    })

    if (!result) {
        delete updateCallbacks[updateCallbackId];
        onChangeCallback(new Error('Unable to request state update'));
    }
}

function describe(el) {
    return {
        did: el.data('did'),
        elId: el.prop('id'),
        featureId: el.data('fid')
    };
}

// TODO: disable all controls: btns, inputs & links while pendingChanges are active
// TODO: if pendingChanges are active on refresh, disable all above controls
// TODO: periodically poll server for commited changes, and enable all above controls
// TODO: do the same for all type of elements in schema
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
    
    changeState(did, featureId, value, (err) => {
        elements.forEach((e) => e.prop('disabled', false));
        caller.prop('disabled', false);
        
        if (!err) {
            // TODO: update the list with the new value
        }
    });
}

function removeFromList(caller, listId) {
    const listEl = $(`#${listId}`);
    const itemId = caller.data('item-id');
    
    const { did, featureId } = describe(listEl);

    caller.attr('disabled', 'disabled');

    const value = {
        operation: 'delete',
        value: itemId
    };
    
    changeState(did, featureId, value, (err) => {
        caller.removeAttr('disabled');
        
        if (!err) {
            listEl.find(`li[data-item-id="${itemId}"]`).remove();
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

        changeState(did, featureId, nextState, () => {
            target.prop('disabled', false);
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

$(() => {
    bindControls();
});
