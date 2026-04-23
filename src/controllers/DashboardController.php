<?php

require_once 'AppController.php';

class DashboardController extends AppController {
    public function index() {
        $stats = [
            'nextInspectionDate' => '00.00.0000',
            'nextInspectionCar' => 'Przykladowy Samochod',
            'nextInsuranceDate' => '00.00.0000',
            'nextInsuranceCar' => 'Przykladowy Samochod',
            'lastFuelAmount' => '0 PLN',
            'lastFuelCount' => '0 L',
            'lastFuelMeta' => 'Przykladowy Samochod',
            'carCount' => '0',
            'carCountMeta' => 'Przykladowe Samochody',
        ];

        $cars = [
            [
                'year' => '2022',
                'title' => '-',
                'subtitle' => '-',
                'inspectionDate' => '--.--.----',
                'insuranceDate' => '--.--.----',
                'silhouetteClass' => '',
            ],
            [
                'year' => '2021',
                'title' => '-',
                'subtitle' => '-',
                'inspectionDate' => '--.--.----',
                'insuranceDate' => '--.--.----',
                'silhouetteClass' => ' is-blue',
            ],
            [
                'year' => '2022',
                'title' => '-',
                'subtitle' => '-',
                'inspectionDate' => '--.--.----',
                'insuranceDate' => '--.--.----',
                'silhouetteClass' => ' is-silver',
            ],
        ];

        return $this->render("dashboard", [
            "stats" => $stats,
            "cars" => $cars,
        ]);
    }
}
