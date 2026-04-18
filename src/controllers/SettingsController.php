<?php

class SettingsController extends AppController
{
    public function index()
    {
        $title = '5 - Settings';

        return $this->render('settings', ['title' => $title]);
    }
}
