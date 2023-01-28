'use strict';

function changeState(deviceId, featureId, value, elId, onChangeCallback) {
    // Ajax, change state (set pendingChange = 1 on state)
    // Store elId on server memory and when received new state for the device, assign the change to elId
    // and on next refresh request, return only changed elements then execute callback assigned to elId
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
            value = el.is(':checked');
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
    
    changeState(did, featureId, value, formId, (data) => {
        elements.forEach((e) => e.prop('disabled', false));
        caller.prop('disabled', false);
        // TODO: update the list with the new value
    });
}

function setList(caller, listId) {
    const listEl = $(`#${listId}`);

    const { did, featureId } = describe(listEl);
    
    const values = listEl.val();
    
    caller.prop('disabled', true);
    listEl.prop('disabled', true);
    
    changeState(did, featureId, values, listId, () => {
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
        
        const nextState = target.is(':checked');
        target.prop('disabled', true);
        
        const { did, featureId, elId } = describe(target);

        changeState(did, featureId, nextState, elId, () => {
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
        
        if (target.data('operator') === 'delete' && target.data('role') === 'list-control') {
            e.preventDefault();
            e.stopPropagation();
            console.log('removing item');
        }
    });
    
}

$(() => {
    bindControls();
});
