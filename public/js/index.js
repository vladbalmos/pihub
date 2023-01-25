'use strict';

function changeState(deviceId, featureId, value, elId, onChangeCallback) {
    // Ajax, change state (set pendingChange = 1 on state)
    // Store elId on server memory and when received new state for the device, assign the change to elId
    // and on next refresh request, return only changed elements then execute callback assigned to elId
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
        
        const did = target.data('did');
        const featureId = target.data('fid');
        const elId = target.prop('id');

        changeState(did, featureId, nextState, elId, () => {
            target.prop('disabled', false);
        })
    })
    
}

$(() => {
    bindControls();
});
