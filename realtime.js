var debug = false; var debug2 = false;
// TODO: UI REACT?
window.onload = () => {
    'use strict';
  
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker
               .register('sw.js');
    }
  }

  
$(document).ready(function() {
    console.log("ready!");

    // Vonage_Service "Aspect"
    //nvmClient_Id = "2e49ef0e-8aed-421d-87c0-241f6936ec4e";
    //nvmClient_Secret = "jn87o5AHAv00yPdXczj0KdJOiuCbpfyo0K2GrNYE";
    // RDC "rtData"
    nvmClient_Id="1b5dcdde-e5f0-4f09-ad85-14edecb4c986";
    nvmClient_Secret="YUuekBLFInpNLlfCmRtm4FM7MfoGpT1kWdzNqhYX";
    // DBrownTest "Interactions"
    //nvmClient_Id = '978688a0-a44c-46b1-b674-07238659b29f';
    //nvmClient_Secret = '4uZHBsTdXovfcrqjbpagk5EPSCtkJt9zkapH6LZp';
    nvmNode = "nam";
    
    var qInteractions = '';
    var qQueueTimes = '';
    //var qQueueData = '';
    var table = $('#nvmdata').DataTable({
        paging: false,
        info: false
    });
 
    //getToken(nvmClient_Id, nvmClient_Secret);
    getToken(nvmClient_Id, nvmClient_Secret); 
    setInterval(function() { getToken(nvmClient_Id, nvmClient_Secret); },5000);
    setInterval(function() { combineResults(); },1000);
    
    function getToken(client_id, client_secret) {
        if (debug) {console.log(client_id + ":" + client_secret);}
        $.ajax({
            url: "https://" + nvmNode + ".newvoicemedia.com/Auth/connect/token",
            type: "POST",
            data:
                "grant_type=client_credentials" + 
                "&client_id=" + client_id + 
                "&client_secret=" + client_secret +
                "&scope=stats",
            headers: { 
                "Content-Type": "application/x-www-form-urlencoded",
            },
            dataType: "json",
            success: function(data) {
                if (debug) {console.log(data.access_token);                }
                getInteractionsOngoing(data.access_token);
                getQueueTimes(data.access_token);
            },
            error: function(jqxhr) {
                console.log(jqxhr.status + " " + jqxhr.statusText);
            }
        });
    }
    function getInteractionsOngoing(token) {
        console.log("<getInteractionsOngoing" + "-".repeat(20) + "BEGIN>");
        var iQueues = [];   // all interaction queues
        var  Queues = [];   // summarized queues

        $.ajax({
            url:  "https://" + nvmNode + ".api.newvoicemedia.com/stats/interactions/ongoing?limit=5000",
            type: "GET",
            headers: {
                Accept: "application/vnd.newvoicemedia.v3+json",
                Authorization: "bearer " + token
            },
            dataType: "json",
            success: function(data) {
                if (debug) {console.info(data)};
                
                iQueues = []; Queues = [];
                for (i = 0; i < data.items.length; i++) {
                    var interaction = data.items[i];
                    if (interaction.direction == "Inbound" && interaction.status == "Ongoing"){
                        for (j = 0; j < interaction.channels.length; j++) {
                            var channel = interaction.channels[j];
                            if (channel.party.role == "External" && channel.party.touchpoint == interaction.connectFrom && channel.endReason == null){
                                var event = channel.events[channel.events.length-1]
                                if (event.type == "Queue") {
                                    var queue = {
                                        InteractionGuid: interaction.guid,
                                        InteractionStartTime: interaction.start,
                                        ServiceName: interaction.serviceName,
                                        InteractionPlan: event.properties.interactionPlan,
                                        Name: event.name,
                                        Duration: moment().diff(moment(interaction.start).add(event.offset,'millisecond'))
                                    }
                                    iQueues.push(queue);
                                    //debugger;
                                }
                            }
                        }
                    }
                }
                groups = _.groupByMulti(iQueues,['InteractionPlan','Name']);

                for (var key in groups) { 
                    var sQueue = {
                        InteractionPlan: '',
                        ServiceName: '',
                        Name: '',
                        LongestWaitTime: '',
                        ShortestWaitTime: '',
                        AverageWaitTime: '',
                        CallsWaiting: ''
                    }
                    for (var subkey in groups[key]){
                        sQueue.InteractionPlan = groups[key][subkey][0].InteractionPlan;
                        sQueue.ServiceName = groups[key][subkey][0].ServiceName;
                        sQueue.Name = subkey;
                        sQueue.LongestWaitTime = Math.round(_.max(groups[key][subkey],'Duration').Duration/1000)
                        sQueue.ShortestWaitTime = Math.round(_.min(groups[key][subkey],'Duration').Duration/1000)
                        sQueue.CallsWaiting = groups[key][subkey].length;
                        sQueue.AverageWaitTime = Math.round((moment.utc((groups[key][subkey].reduce((s, f) => s + f.Duration, 0))/1000) / sQueue.CallsWaiting))
                        Queues.push(sQueue);
                    }
                }
                qInteractions = Queues.slice(0);
                if (debug) {console.log("<getInteractionsOngoing" + "-".repeat (20) + "END>");}
                
                if (debug2) {
                    Queues = _.sortBy(Queues, function(o) {return o.LongestWaitTime;}).reverse();
                    for (i = 0; i < Queues.length; i++){
                        console.log(Queues[i].InteractionPlan + "   (" + Queues[i].ServiceName + ")    " + moment.utc(Queues[i].LongestWaitTime*1000).format("HH:mm:ss") + 
                                    "   " + "   " + Queues[i].CallsWaiting)
                    }
                }
            }
        });
    }
    function getQueueTimes(token) {
        console.log("<getQueueTimes" + "-".repeat(20) + "BEGIN>");
        var iQueues = [];   // all interaction queues
        var  Queues = [];   // summarized queues

        $.ajax({
            url:  "https://" + nvmNode + ".api.newvoicemedia.com/stats/queue-times?include=Processed&start=" + moment().format("YYYY-MM-DD") + "T00:00:00Z",
            type: "GET",
            headers: {
                Accept: "application/vnd.newvoicemedia.v3+json",
                Authorization: "bearer " + token
            },
            dataType: "json",
            success: function(data) {
                if (debug) {console.info(data)};
                
                iQueues = []; Queues = [];          
                for (i = 0; i < data.items.length; i++) {
                    var interaction = data.items[i];
                    var queue = {
                        InteractionGuid: interaction.interactionGuid,
                        InteractionStartTime: interaction.start,
                        InteractionPlan: interaction.interactionPlan,
                        Name: interaction.queue,
                        Category: interaction.category,
                        Duration: interaction.duration
                    }
                    iQueues.push(queue);  
                    //debugger;                  
                }
                groups = _.groupByMulti(iQueues,['InteractionPlan','Name','Category']);

                for (var key in groups) { 
                    var sQueue = {
                            InteractionPlan: '',
                            Name: '',
                            Answered: 0,
                            AnsweredTime: 0,
                            AnsweredRate: 0,
                            AvgAnswerTime: 0,
                            Abandoned: 0,
                            AbandonedTime: 0,
                            AbandonedRate: 0,
                            AvgAbandonTime: 0,
                            Breakout: 0,
                            BreakoutTime: 0,
                            BreakoutRate: 0,
                            AvgBreakoutTime: 0,
                            Offered: 0
                    }
                    sQueue.InteractionPlan = key;
                    for (var subkey in groups[key]){
                        sQueue.Name = subkey;
                        for (var category in groups[key][subkey]){
                            switch (category){
                                case 'Answered':
                                    sQueue.Answered = groups[key][subkey].Answered.length;
                                    sQueue.AnsweredTime = Math.round(groups[key][subkey].Answered.reduce((s, f) => s + f.Duration, 0)/1000);
                                    sQueue.AvgAnswerTime = Math.round(sQueue.AnsweredTime / (sQueue.Answered + 0.00001));
                                    break;
                                case 'Abandoned':
                                    sQueue.Abandoned = groups[key][subkey].Abandoned.length;
                                    sQueue.AbandonedTime = Math.round(groups[key][subkey].Abandoned.reduce((s, f) => s + f.Duration, 0)/1000);
                                    sQueue.AvgAbandonTime = Math.round(sQueue.AbandonedTime / (sQueue.Abandoned + 0.00001));
                                    break;
                                case 'Breakout':
                                    sQueue.Breakout = groups[key][subkey].Breakout.length;
                                    sQueue.BreakoutTime = Math.round(groups[key][subkey].Breakout.reduce((s, f) => s + f.Duration, 0)/1000);
                                    sQueue.AvgBreakoutTime = Math.round(sQueue.BreakoutTime / (sQueue.Breakout + 0.00001));
                                    break;
                            }
                        }
                    }
                    sQueue.Offered = sQueue.Answered + sQueue.Abandoned + sQueue.Breakout;
                    sQueue.AnsweredRate = Math.round(sQueue.Answered / (sQueue.Offered + 0.00001) * 100);
                    sQueue.AbandonedRate = Math.round(sQueue.Abandoned / (sQueue.Offered + 0.00001) * 100);
                    sQueue.BreakoutRate = Math.round(sQueue.Breakout / (sQueue.Offered + 0.00001) * 100);
                    Queues.push(sQueue);
                }
                qQueueTimes = Queues.slice(0);
                if (debug) {console.log("<getQueueTimes" + "-".repeat (20) + "END>");}

                if (debug2) {
                    Queues = _.sortBy(Queues, function(o) {return o.Offered;}).reverse();
                    for (i = 0; i < Queues.length; i++){
                        console.log(Queues[i].InteractionPlan  + "    " + Queues[i].Name + "    "  + Queues[i].Answered)
                    }
                }
            }
        });
    }
    function combineResults()
    {
        if(qInteractions == '' || qQueueTimes == '') {
            console.log('retrieving data, standby ...')
            return;
        } else {
            console.log(qInteractions);
            console.log(qQueueTimes);
        }

        // TODO: add either dataset to merged even if other is empty (match to merged, not each other)
        // TODO: match on "InteractionPlan" AND "Queue" Name
        let merged = [];
        for(let i=0; i<qInteractions.length; i++) {
            merged.push({
             ...qInteractions[i], 
             ...(qQueueTimes.find((itmInner) => itmInner.InteractionPlan === qInteractions[i].InteractionPlan))}
            );
          }
        
        // console.log("InteractionPlan" + "    " + "CW  " + "  " + "LWT     " + "  " + "ANS" + "  " + "ABN")
        // merged = _.sortBy(merged, function(o) {return o.LongestWaitTime;}).reverse();
        // for (i = 0; i < merged.length; i++){
        //     var q = merged[i];
        //     console.log(q.InteractionPlan.padEnd(15) + "    " + q.CallsWaiting.toString().padEnd(4) + "  " + moment.utc(q.LongestWaitTime*1000).format("HH:mm:ss").toString().padEnd(8) + "  " + q.Answered.toString().padEnd(3) + "  " + q.Abandoned.toString().padEnd(3));
        // }

        table.rows().remove();
        $.each( merged, function( key, q ) {
            console.log( key + ": " + q.InteractionPlan + " (" + q.Name + ")" );
            table.row.add([
                q.InteractionPlan,
                q.Name,
                q.CallsWaiting,
                moment.utc(q.LongestWaitTime*1000).format("HH:mm:ss"),
                moment.utc(q.AverageWaitTime*1000).format("HH:mm:ss"),
                q.Answered,
                q.Abandoned,
                q.Breakout,
                q.Offered,
                q.AbandonedRate
            ]).draw()
        });

        // table.rows().remove();
        // for (i = 0; i < merged.length; i++){
        //     var q = merged[i];
        //     table.row.add([
        //         q.InteractionPlan,
        //         q.Name,
        //         q.CallsWaiting,
        //         q.LongestWaitTime
        //     ]).draw()
            //console.log(q.InteractionPlan.padEnd(15) + "    " + q.CallsWaiting.toString().padEnd(4) + "  " + moment.utc(q.LongestWaitTime*1000).format("HH:mm:ss").toString().padEnd(8) + "  " + q.Answered.toString().padEnd(3) + "  " + q.Abandoned.toString().padEnd(3));
        //}
    }

    _.groupByMulti = function (obj, values, context) {
        if (!values.length)
            return obj;
        var byFirst = _.groupBy(obj, values[0], context),
            rest = values.slice(1);
        for (var prop in byFirst) {
            byFirst[prop] = _.groupByMulti(byFirst[prop], rest, context);
        }
        return byFirst;
    };
    
});
