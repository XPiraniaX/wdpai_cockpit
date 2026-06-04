<?php

class SettingsController extends AppController
{
    public function index()
    {
        $this->requireAuthentication();
        $title = 'Ustawienia';

        return $this->render('settings', [
            'title' => $title,
            'scriptFiles' => ['settings.js'],
        ]);
    }
}
