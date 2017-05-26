var batteryApp = angular.module('batteryApp', []);

// Define the `PhoneListController` controller on the `phonecatApp` module
batteryApp.controller('BatteryController', ['$scope', '$interval', function BatteryController($scope, $interval) {
  $scope.title = "Battery Tester v1.0";
  $scope.graph_ctx = document.getElementById("myChart");
  $scope.tester = { "load": { "type": "ohms", "amount": 12.11 }, "pack": { "series": 2, "parallel": 1 }, "cell": { "start": 4.20, "cutoff": 2.85 }, "has_started": false, "has_stopped": false};
  $scope.current_voltage = 0;
  $scope.display_voltage = function(){
    if(!$scope.tester.has_started){
      num = $scope.tester.pack.series * $scope.tester.cell.start;
      return num.toFixed(2)
    } else {
      return $scope.current_voltage.toFixed(2);
    }
  }
  $scope.update = function(){
    time_dif = new Date()- $scope.start_time
    if(time_dif < 1000){
      time_dif = 0;
    }
    $scope.history.push([$scope.current_voltage, time_dif])
    $scope.graph.data.datasets[0].data.push({x: $scope.accumulated_amps(), y: $scope.current_voltage});
    $scope.graph.update()
  }
  $scope.test_start = function(){
    $scope.tester.has_started = true;
    $scope.current_voltage = $scope.tester.pack.series * $scope.tester.cell.start;
    $scope.start_time = new Date();
    $scope.history = [];
    $scope.current_voltage += 0.01;
    $scope.graph = new Chart($scope.graph_ctx, {
    type: 'line',
    data: {
        datasets: [{
            backgroundColor: "rgba(0,0,0,0)",
            borderColor: "rgba(0,127,255,1)",
            pointBorderColor: "rgba(151,187,205,1)",
            label: 'Voltage',
            data: [],
        }]
     },
     options: {
        maintainAspectRatio: false,
        legend: {
          display: false
        },
        elements: {
                    point:{
                        radius: 0
                    }
                },
        scales: {
            yAxes: [{
                type: 'linear',
                scaleLabel: {
                  display: true,
                  labelString: 'Voltage'
                },
                ticks: {
                  suggestedMin: $scope.tester.pack.series * $scope.tester.cell.cutoff
                }
            }],
            xAxes: [{
                scaleLabel: {
                  display: true,
                  labelString: 'Capacity [mAh]'
                },
                type: 'linear',
                position: 'bottom',
                ticks: {
                    beginAtZero: true,
                    suggestedMax: 10,
                }
            }]
        }
    }
    });
    $scope.interval_promise = $interval($scope.update, 500)
    $scope.decrease_volt();
  }

  $scope.reload = function(){
    window.location.reload(false);
  }


  $scope.test_end = function(by_user){
    $scope.tester.has_stopped = true;
    if(by_user){
      $scope.tester.stopped_by_user = true;
    }
    $interval.cancel($scope.interval_promise);
  }

  $scope.download = function(){
    save_string = ""
    for (var i = 0; i < $scope.history.length; i++) {
      voltage = $scope.history[i][0];
      time = $scope.history[i][1];
      save_string += time/1000 + ", "
      save_string += voltage + "\n"
    }
    blob = new Blob([save_string], {type : 'text/csv'})
    saveAs(blob, (new Date()).getTime() + ".log")
  }

  $scope.download_graph = function(){
    $scope.color_canvas_background($scope.graph_ctx);
    blob = $scope.graph_ctx.toBlob(function(blob){
      saveAs(blob, "image.png")
    })
  }

  $scope.color_canvas_background = function(canvas) {
    var w = canvas.width;
    var h = canvas.height;
    context = canvas.getContext("2d");

    data = context.getImageData(0, 0, w, h);
    context.globalCompositeOperation = "destination-over";
    context.fillStyle = "rgba(255,255,255,1)";
    context.fillRect(0,0,w,h);
  }

  $scope.decrease_volt = function () {
    if($scope.tester.has_stopped){
      return;
    }
    console.log($scope.tester.cell.cutoff * $scope.tester.pack.series)
    if($scope.current_voltage < $scope.tester.cell.cutoff * $scope.tester.pack.series){
      $scope.test_end(false)
    } else {
      $scope.current_voltage -= 0.01;
      $scope.update()
    }
  }
  $scope.current_draw = function(){
    if($scope.tester.has_stopped){
      return (0).toFixed(3)
    }
    if($scope.tester.has_started){
      $scope.batt_volt = $scope.current_voltage;
    } else {
      $scope.batt_volt = $scope.tester.pack.series * $scope.tester.cell.start;
    }

    if($scope.tester.load.type == "ohms"){
      num = $scope.batt_volt / $scope.tester.load.amount;
      return num.toFixed(3);
    } else if($scope.tester.load.type == "amps"){
      return $scope.tester.load.amount
    } else {
      num = $scope.tester.load.amount / $scope.batt_volt
      return num.toFixed(3)
    }
  }

  $scope.power_draw = function(){
    if($scope.tester.has_stopped){
      return (0).toFixed(3)
    }
    if($scope.tester.has_started){
      $scope.batt_volt = $scope.current_voltage;
    } else {
      $scope.batt_volt = $scope.tester.pack.series * $scope.tester.cell.start;
    }

    num = $scope.batt_volt * $scope.current_draw();
    return num.toFixed(2);
  }

  $scope.accumulated_amps = function(){
    if($scope.tester.has_started){
    previous = 0;
    amperage = 0;
    for (var i = 0; i < $scope.history.length; i++) {
      if(previous == 0){
        previous = $scope.history[i];
        continue;
      }
      voltage = $scope.history[i][0];
      time = $scope.history[i][1];

      time_past_ms = time - previous[1]
      time_past_s = time_past_ms / 1000;
      time_past_hrs = time_past_s / 3600;
      if($scope.tester.load.type == "ohms"){
        current = voltage / $scope.tester.load.amount;
        amperage  += current * time_past_hrs
      } else if($scope.tester.load.type == "amps"){
        amperage += $scope.tester.load.amount * time_past_hrs
      } else {
        current = $scope.tester.load.amount / voltage;
        amperage += current * time_past_hrs
      }
      previous = $scope.history[i];
    }
    return (amperage*1000).toFixed(3);
  } else {
    return (0).toFixed(3);
  }
}

$scope.accumulated_watts = function(){
  if($scope.tester.has_started){
  previous = 0;
  power_tot = 0;
  for (var i = 0; i < $scope.history.length; i++) {
    if(previous == 0){
      previous = $scope.history[i];
      continue;
    }
    voltage = $scope.history[i][0];
    time = $scope.history[i][1];

    time_past = time - previous[1]
    time_past = time_past / 1000;
    if($scope.tester.load.type == "ohms"){
      current = voltage / $scope.tester.load.amount;
      power = voltage * current;
      power_tot += power * time_past/3600;

    } else if($scope.tester.load.type == "amps"){
      power = voltage * $scope.tester.load.amount;
      power_tot += power * time_past/3600;
    } else {
      power_tot += $scope.tester.load.amount * time_past/3600;

    }
    previous = $scope.history[i];
  }
  return power_tot.toFixed(3);
} else {
  return (0).toFixed(3);
}
}
}]);
